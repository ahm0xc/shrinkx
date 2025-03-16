import { execa } from 'execa'
import path from 'path'
import fs from 'fs'
import os from 'os'
import ffmpeg from 'ffmpeg-static'
import ffprobe from 'ffprobe-static'
import sharp from 'sharp'

import { VideoCompressionSettings } from '../shared/types'
import { mapRange } from '../shared/utils'

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
  inputPath: string,
  {
    settings,
    onProgress,
    onComplete
  }: {
    settings: VideoCompressionSettings
    onProgress: (progress: number) => void
    onComplete: ({ outputPath, timeTook }: { outputPath: string; timeTook: number }) => void
  }
) {
  if (!ffmpeg || !ffprobe?.path) {
    throw new Error('ffmpeg or ffprobe binaries not found')
  }

  const ffmpegPath = ffmpeg as string
  const ffprobePath = ffprobe.path

  const startTime = Date.now()
  await new Promise(async (resolve, reject) => {
    try {
      const outputDir = path.dirname(inputPath)
      const outputFileName = `compressed-${path.basename(inputPath)}`
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
        inputPath
      ])

      // Get audio bitrate using ffprobe
      const audioBitrateProcess = await execa(ffprobePath, [
        '-v',
        'error',
        '-select_streams',
        'a:0',
        '-show_entries',
        'stream=bit_rate',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        inputPath
      ])

      const audioBitrate = parseInt(audioBitrateProcess.stdout) || 0
      const audioBitrateInMbps = audioBitrate / 1000000 || 0
      console.log(`Audio bitrate: ${audioBitrate} bps (${audioBitrateInMbps} Mbps)`)

      // Get video bitrate using ffprobe
      const videoBitrateProcess = await execa(ffprobePath, [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=bit_rate',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        inputPath
      ])

      const videoBitrate = parseInt(videoBitrateProcess.stdout) || 0
      const videoBitrateInMbps = videoBitrate / 1000000 || 0
      console.log(`Video bitrate: ${videoBitrate} bps (${videoBitrateInMbps} Mbps)`)

      const totalDurationInSeconds = parseFloat(durationProcess.stdout) || 0

      const ffmpegArgs: string[] = []

      const baseFfmpegArgs = [
        '-i',
        inputPath,
        '-vcodec', // makes the speed faster
        'libx264',
        '-threads',
        '0',
        '-acodec',
        'libopus'
      ]

      ffmpegArgs.push(...baseFfmpegArgs)

      if (settings.resolution !== 'preserve') {
        ffmpegArgs.push('-vf', `scale=${settings.resolution}`)
      }

      if (settings.compressionQuality) {
        const crf = mapRange(settings.compressionQuality ?? 40, 0, 100, 24, 40)
        ffmpegArgs.push('-crf', crf.toString())
      }

      if (settings.speed !== 'default') {
        ffmpegArgs.push('-preset', settings.speed)
      }

      if (audioBitrateInMbps > 0.6) {
        ffmpegArgs.push('-b:a', '0.6M')
      }

      if (videoBitrateInMbps > 5) {
        ffmpegArgs.push('-b:v', '5M')
      }

      if (settings.removeAudio) {
        ffmpegArgs.push('-an')
      }

      ffmpegArgs.push(outputPath)

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

      const endTime = Date.now()
      const timeTook = endTime - startTime

      onProgress(100)
      onComplete({ outputPath, timeTook })
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
  if (!ffmpeg) {
    throw new Error('ffmpeg or ffprobe binaries not found')
  }

  const ffmpegPath = ffmpeg as string

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
