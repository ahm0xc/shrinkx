import { execa } from 'execa'
import path from 'path'
import fs from 'fs'
import os from 'os'
import ffmpeg from 'ffmpeg-static'
import ffprobe from 'ffprobe-static'
import sharp from 'sharp'
import AdmZip from 'adm-zip'

import { ImageCompressionSettings, VideoCompressionSettings } from '../shared/types'
import { mapRange } from '../shared/utils'

export function getFileSize(filePath: string) {
  return fs.statSync(filePath).size
}

export function deleteFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

export function renameFile(oldPath: string, newPath: string) {
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath)
  }
}

export function createFolder(folderPath: string) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true })
  }
}

export function emptyFolder(folderPath: string) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      fs.unlinkSync(path.join(folderPath, file))
    })
  }
}

export function unzip(zipPath: string, outputFolderPath: string) {
  const zip = new AdmZip(zipPath)
  zip.extractAllTo(outputFolderPath, true)
}

export async function compressImage(
  imagePath: string,
  {
    settings,
    onProgress,
    onComplete
  }: {
    settings: ImageCompressionSettings
    onProgress: (progress: number) => void
    onComplete: ({
      outputPath,
      size,
      timeTook
    }: {
      outputPath: string
      size: number
      timeTook: number
    }) => void
  }
) {
  return new Promise(async (resolve, reject) => {
    try {
      const startTime = Date.now()
      const outputDir = path.dirname(imagePath)
      const outputFileName = `compressed-${path.basename(imagePath)}`
      const outputPath = path.join(outputDir, outputFileName)

      const quality = mapRange(settings.compressionQuality ?? 80, 0, 100, 20, 60)

      await sharp(imagePath).jpeg({ quality }).toFile(outputPath)

      const outputFileSize = getFileSize(outputPath)

      if (settings.replaceInputFile) {
        deleteFile(imagePath)
        renameFile(outputPath, imagePath)
      }

      const endTime = Date.now()
      const timeTook = endTime - startTime

      onProgress(100)
      onComplete({
        outputPath,
        size: outputFileSize,
        timeTook
      })
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
    onComplete: ({
      outputPath,
      size,
      timeTook
    }: {
      outputPath: string
      size: number
      timeTook: number
    }) => void
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
      deleteFile(outputPath)

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

      const outputFileSize = getFileSize(outputPath)

      if (settings.replaceInputFile) {
        deleteFile(inputPath)
        renameFile(outputPath, inputPath)
      }

      onProgress(100)
      onComplete({
        outputPath,
        size: outputFileSize,
        timeTook
      })
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

// export async function installDependencies({
//   onProgress,
//   onCompleted,
//   onCancel
// }: {
//   onProgress?: (progress: DlProgress) => void
//   onCompleted?: (file: DlFile) => void
//   onCancel?: () => void
// }) {
//   const dependenciesFolderPath = path.join(app.getPath('home'), '.ShrinkX_Dependencies')
//   emptyFolder(dependenciesFolderPath)
//   createFolder(dependenciesFolderPath)

//   const focusedWindow = BrowserWindow.getFocusedWindow()

//   if (!focusedWindow) throw new Error('No focused window found')

//   await download(
//     focusedWindow,
//     'https://5kkscs4luj.ufs.sh/f/yWO233OZgnAQQx55aYSLBzEZFfVTJO0qmy2v8aj956WQuMwC',
//     {
//       directory: dependenciesFolderPath,
//       filename: 'deps.zip',
//       onProgress,
//       onCompleted,
//       onCancel: () => {
//         onCancel?.()
//       }
//     }
//   )

//   unzip(path.join(dependenciesFolderPath, 'deps.zip'), dependenciesFolderPath)
//   deleteFile(path.join(dependenciesFolderPath, 'deps.zip'))
// }

type ValidateLicenseKeyResponse = {
  data: {
    isValid: boolean
    user: {
      id: string
      email: string
      name: string
      imageUrl: string
    }
  } | null
  error: string | null
}

export async function validateLicenseKey(licenseKey: string): Promise<ValidateLicenseKeyResponse> {
  try {
    const response = await fetch('https://shrinkx.vercel.app/api/validate-license', {
      method: 'POST',
      body: JSON.stringify({ licenseKey })
    })
    if (!response.ok) {
      return {
        data: null,
        error: 'Invalid license key'
      }
    }
    const data = await response.json()
    return { data, error: null }
  } catch {
    return {
      data: null,
      error: 'Failed to validate license key'
    }
  }
}
