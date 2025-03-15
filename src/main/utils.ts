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

      // Get CPU core count for optimal thread usage
      const cpuCores = os.cpus().length
      const optimalThreadCount = Math.max(2, cpuCores - 1) // Leave one core free for system

      // Try hardware acceleration first, then fall back to software if it fails
      const platform = os.platform()
      let ffmpegArgs: string[]

      // For macOS, use VideoToolbox for GPU encoding with CPU assistance
      if (platform === 'darwin') {
        // Use a bitrate-based approach which is more compatible with hardware encoding
        // Convert quality (1-100) to a bitrate range (500k-8000k)
        const bitrate = Math.round(500 + (quality / 100) * 7500)

        ffmpegArgs = [
          // Allow FFmpeg to use CPU for pre/post processing
          '-threads',
          optimalThreadCount.toString(),
          '-i',
          videoPath,
          // Use GPU for actual encoding
          '-c:v',
          'h264_videotoolbox',
          // Parallel video frame processing with lookahead
          '-b:v',
          `${bitrate}k`,
          '-maxrate',
          `${bitrate * 1.5}k`,
          '-bufsize',
          `${bitrate * 3}k`,
          // Use CPU for audio processing if audio exists
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          // Define shared thread pool for CPU tasks
          '-filter_threads',
          Math.floor(optimalThreadCount / 2).toString(),
          '-filter_complex_threads',
          Math.floor(optimalThreadCount / 2).toString(),
          // Ensure compatibility
          '-pix_fmt',
          'yuv420p',
          outputPath
        ]
      }
      // For Windows, use NVENC with CPU assist
      else if (platform === 'win32') {
        ffmpegArgs = [
          '-threads',
          optimalThreadCount.toString(),
          '-i',
          videoPath,
          // GPU encoding
          '-c:v',
          'h264_nvenc',
          // Set lookahead to utilize CPU for analysis
          '-rc-lookahead',
          '32',
          '-preset',
          'p4',
          '-rc',
          'vbr',
          '-cq',
          crf.toString(),
          // CPU for audio
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          // CPU resources for filtering
          '-filter_threads',
          Math.floor(optimalThreadCount / 2).toString(),
          outputPath
        ]
      }
      // For Linux, use NVENC with CPU assist
      else if (platform === 'linux') {
        ffmpegArgs = [
          '-threads',
          optimalThreadCount.toString(),
          '-i',
          videoPath,
          // GPU encoding
          '-c:v',
          'h264_nvenc',
          // Set lookahead to utilize CPU for analysis
          '-rc-lookahead',
          '32',
          '-preset',
          'p4',
          '-rc',
          'vbr',
          '-cq',
          crf.toString(),
          // CPU for audio
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          // CPU resources for filtering
          '-filter_threads',
          Math.floor(optimalThreadCount / 2).toString(),
          outputPath
        ]
      }
      // Default software encoding
      else {
        ffmpegArgs = [
          '-i',
          videoPath,
          '-c:v',
          'libx264',
          '-crf',
          crf.toString(),
          '-preset',
          'medium',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-threads',
          optimalThreadCount.toString(),
          outputPath
        ]
      }

      console.log('Using FFmpeg command:', ffmpegPath, ffmpegArgs.join(' '))

      // Try with hybrid CPU/GPU acceleration first
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
        // If hardware acceleration fails, fall back to optimized software encoding
        console.warn(
          'Hardware acceleration failed, falling back to software encoding:',
          hwError instanceof Error ? hwError.message : String(hwError)
        )

        // Only proceed with fallback if the output file wasn't created or is empty
        const outputExists = fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0
        if (!outputExists) {
          // Use optimized CPU-only encoding with all available threads
          const softwareArgs = [
            '-i',
            videoPath,
            '-c:v',
            'libx264',
            '-crf',
            crf.toString(),
            '-preset',
            'medium',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            // Use all CPU cores for encoding
            '-threads',
            cpuCores.toString(),
            // Additional CPU optimization flags
            '-tune',
            'film',
            '-pix_fmt',
            'yuv420p',
            outputPath
          ]

          console.log(
            'Falling back to optimized software encoding:',
            ffmpegPath,
            softwareArgs.join(' ')
          )

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
