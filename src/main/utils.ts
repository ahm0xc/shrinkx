import { execa } from 'execa'
import pngquant from 'pngquant-bin'
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
      // Map quality from 1-100 to pngquant's range (0-100)
      const minQuality = Math.max(0, Math.min(quality - 10, 100)) // Ensure a valid range
      const maxQuality = Math.max(minQuality + 10, Math.min(quality, 100))

      const outputPath = path.join(
        path.dirname(imagePath),
        `compressed-${path.basename(imagePath)}`
      )

      const process = execa(pngquant, [
        `--quality=${minQuality}-${maxQuality}`,
        '--speed=1', // Slowest but best compression
        '--force', // Overwrite existing file if needed
        '-o',
        outputPath,
        imagePath
      ])

      let progress = 0

      process.stdout?.on('data', () => {
        progress = Math.min(progress + 20, 100)
        onProgress(progress)
      })

      await process

      // Ensure progress reaches 100% on completion
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

      const outputPath = path.join(
        path.dirname(videoPath),
        `compressed-${path.basename(videoPath)}`
      )

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

      const process = execa(ffmpegPath, [
        '-i',
        videoPath,
        '-vcodec',
        'libx264',
        '-crf',
        crf.toString(),
        '-threads',
        '0',
        outputPath
      ])

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
    } catch (error) {
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

  console.log('🚀 ~ getVideoPreview ~ previewPath:', previewPath)

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
