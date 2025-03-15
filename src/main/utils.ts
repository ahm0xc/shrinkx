import { execa } from 'execa'
import path from 'path'
import fs from 'fs'
import os from 'os'
import ffmpeg from 'ffmpeg-static'
import ffprobe from 'ffprobe-static'
import sharp from 'sharp'

if (!ffmpeg || !ffprobe?.path) {
  throw new Error('ffmpeg or ffprobe binaries not found')
}

const ffmpegPath = ffmpeg as string
const ffprobePath = ffprobe.path

export async function compressImage(
  imagePath: string,
  {
    quality = 80,
    onProgress,
    onComplete
  }: {
    quality?: number
    onProgress: (progress: number) => void
    onComplete: (compressedImagePath: string) => void
  }
) {
  return new Promise(async (resolve, reject) => {
    try {
      const outputDir = path.dirname(imagePath)
      const outputFileName = `compressed-${path.basename(imagePath)}`
      const outputPath = path.join(outputDir, outputFileName)

      await sharp(imagePath).jpeg({ quality }).toFile(outputPath)

      console.log('complete')
      onProgress(100)
      onComplete(outputPath)
      resolve(outputPath)
    } catch (error) {
      reject(error)
    }
  })
}

export async function compressVideo(
  videoPath: string,
  {
    quality = 48,
    onProgress,
    onComplete
  }: {
    quality?: number
    onProgress: (progress: number) => void
    onComplete: (compressedVideoPath: string) => void
  }
) {
  return new Promise(async (resolve, reject) => {
    try {
      // Map quality (1-100) to FFmpeg's CRF (Constant Rate Factor) range (0-51)
      const crf = Math.round(51 - (quality / 100) * 50) // Lower CRF means higher quality

      const outputDir = path.dirname(videoPath)
      const outputFileName = `compressed-${path.basename(videoPath)}`
      const outputPath = path.join(outputDir, outputFileName)

      // Ensure the output file does not exist before processing
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath)
      }

      // Get duration using ffprobe (much faster than ffmpeg)
      const durationProcess = await execa(ffprobePath, [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        videoPath
      ])

      const totalDurationInSeconds = parseFloat(durationProcess.stdout) || 0

      // Try hardware acceleration first, then fall back to software if it fails
      const platform = os.platform()
      let ffmpegArgs: string[]

      // For macOS, try to use VideoToolbox
      if (platform === 'darwin') {
        // Use a bitrate-based approach which is more compatible with hardware encoding
        // Convert quality (1-100) to a bitrate range (500k-8000k)
        const bitrate = Math.round(500 + (quality / 100) * 7500)

        ffmpegArgs = [
          '-i',
          videoPath,
          '-c:v',
          'h264_videotoolbox', // macOS hardware encoder
          '-b:v',
          `${bitrate}k`, // Use bitrate instead of CRF/quality
          '-maxrate',
          `${bitrate * 1.5}k`,
          '-bufsize',
          `${bitrate * 3}k`,
          '-preset',
          'medium', // Balance between speed and quality
          '-pix_fmt',
          'yuv420p', // Ensure compatibility
          '-threads',
          '0', // Use optimal thread count
          outputPath
        ]
      }
      // For Windows, try NVENC
      else if (platform === 'win32') {
        ffmpegArgs = [
          '-i',
          videoPath,
          '-c:v',
          'h264_nvenc', // NVIDIA hardware encoder
          '-preset',
          'p4', // Good balance preset
          '-rc',
          'vbr', // Variable bitrate
          '-cq',
          crf.toString(), // Quality level
          '-threads',
          '0',
          outputPath
        ]
      }
      // For Linux, try NVENC or VAAPI
      else if (platform === 'linux') {
        ffmpegArgs = [
          '-i',
          videoPath,
          '-c:v',
          'h264_nvenc', // Try NVIDIA first
          '-preset',
          'p4',
          '-rc',
          'vbr',
          '-cq',
          crf.toString(),
          '-threads',
          '0',
          outputPath
        ]
      }
      // Default software encoding fallback
      else {
        ffmpegArgs = [
          '-i',
          videoPath,
          '-c:v',
          'libx264', // Software x264 encoder
          '-crf',
          crf.toString(), // Quality control
          '-preset',
          'medium', // Balance between speed and quality
          '-threads',
          '0',
          outputPath
        ]
      }

      console.log('Using FFmpeg command:', ffmpegPath, ffmpegArgs.join(' '))

      // Try with hardware acceleration first
      try {
        const process = execa(ffmpegPath, ffmpegArgs)

        process.stderr?.on('data', (data) => {
          const message = data.toString()
          const match = message.match(/time=(\d+):(\d+):(\d+\.\d+)/)
          if (match && totalDurationInSeconds > 0) {
            const [, hours, minutes, seconds] = match.map(Number)
            const currentTimeInSeconds = hours * 3600 + minutes * 60 + seconds

            // Calculate actual percentage
            const progress = Math.min((currentTimeInSeconds / totalDurationInSeconds) * 100, 100)
            onProgress(progress)
          }
        })

        await process

        onProgress(100)
        onComplete(outputPath)
        resolve(outputPath)
      } catch (hwError: unknown) {
        // If hardware acceleration fails, fall back to software encoding
        console.warn(
          'Hardware acceleration failed, falling back to software encoding:',
          hwError instanceof Error ? hwError.message : String(hwError)
        )

        // Only proceed with fallback if the output file wasn't created or is empty
        const outputExists = fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0
        if (!outputExists) {
          const softwareArgs = [
            '-i',
            videoPath,
            '-c:v',
            'libx264', // Software encoder
            '-crf',
            crf.toString(), // Quality control
            '-preset',
            'medium', // Balance between speed and quality
            '-pix_fmt',
            'yuv420p', // Ensure compatibility
            '-threads',
            '0',
            outputPath
          ]

          console.log('Falling back to software encoding:', ffmpegPath, softwareArgs.join(' '))

          const fallbackProcess = execa(ffmpegPath, softwareArgs)

          fallbackProcess.stderr?.on('data', (data) => {
            const message = data.toString()
            const match = message.match(/time=(\d+):(\d+):(\d+\.\d+)/)
            if (match && totalDurationInSeconds > 0) {
              const [, hours, minutes, seconds] = match.map(Number)
              const currentTimeInSeconds = hours * 3600 + minutes * 60 + seconds

              // Calculate actual percentage
              const progress = Math.min((currentTimeInSeconds / totalDurationInSeconds) * 100, 100)
              onProgress(progress)
            }
          })

          await fallbackProcess
          onProgress(100)
          onComplete(outputPath)
          resolve(outputPath)
        } else {
          // Output file exists and has content, so hardware acceleration worked partially
          onProgress(100)
          onComplete(outputPath)
          resolve(outputPath)
        }
      }
    } catch (error) {
      console.error('Error during video compression:', error)
      reject(error)
    }
  })
}

export async function getImagePreview(imagePath: string): Promise<string | null> {
  try {
    const image = sharp(imagePath)

    const previewBuffer = await image.resize(200, 200, { fit: 'cover' }).toBuffer()
    return `data:image/jpeg;base64,${previewBuffer.toString('base64')}`
  } catch (error) {
    console.error('Failed to get image preview:', error)
    return null
  }
}

export async function getVideoPreview(videoPath: string): Promise<string | null> {
  const previewPath = path.join(os.tmpdir(), `preview-${crypto.randomUUID()}.jpg`)

  try {
    // Extract a frame at 1 second or 10% of the video duration, whichever is less
    await execa(ffmpegPath, [
      '-ss',
      '1', // Seek to 1 second
      '-i',
      videoPath,
      '-vframes',
      '1', // Extract 1 frame
      '-q:v',
      '2', // High quality
      '-vf',
      'scale=200:-1', // Scale width to 200px, maintain aspect ratio
      previewPath
    ])

    // Convert the preview to base64
    const previewBuffer = await fs.promises.readFile(previewPath)
    const base64Preview = `data:image/jpeg;base64,${previewBuffer.toString('base64')}`

    return base64Preview
  } catch (error) {
    console.error('Failed to get video preview:', error)
    return null
  } finally {
    // Clean up the temporary preview file
    try {
      if (fs.existsSync(previewPath)) {
        await fs.promises.unlink(previewPath)
      }
    } catch (error) {
      console.error('Failed to clean up preview file:', error)
    }
  }
}
