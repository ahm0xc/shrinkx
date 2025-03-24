import path from 'path'
import fs from 'fs'
import os from 'os'
import sharp from 'sharp'
import { spawn } from 'child_process'
import { app, BrowserWindow } from 'electron'
import unzipper from 'unzipper'
import DownloadManager from 'electron-download-manager'
import { platform } from '@electron-toolkit/utils'

import { ImageCompressionSettings, Platform, VideoCompressionSettings } from '../shared/types'
import { mapRange, tryCatch } from '../shared/utils'
import { DEPENDENCIES } from '../shared/config'

interface ExecaResult {
  stdout: string
  stderr: string
  exitCode: number
}

interface ExecaProcess extends Promise<ExecaResult> {
  stdout?: NodeJS.ReadableStream
  stderr?: NodeJS.ReadableStream
  kill?: () => void
}

function execa(command: string, args: string[] = []): ExecaProcess {
  let stdout = ''
  let stderr = ''

  const childProcess = spawn(command, args, { shell: false })

  childProcess.stdout?.on('data', (data) => {
    stdout += data.toString()
  })

  childProcess.stderr?.on('data', (data) => {
    stderr += data.toString()
  })

  const promise = new Promise<ExecaResult>((resolve, reject) => {
    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, exitCode: code || 0 })
      } else {
        const error = new Error(`Command failed with exit code ${code}`)
        Object.assign(error, { stdout, stderr, exitCode: code || 1 })
        reject(error)
      }
    })

    childProcess.on('error', (err) => {
      reject(Object.assign(err, { stdout, stderr, exitCode: 1 }))
    })
  }) as ExecaProcess

  promise.stdout = childProcess.stdout
  promise.stderr = childProcess.stderr
  promise.kill = () => childProcess.kill()

  return promise
}

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
  return new Promise((resolve, reject) => {
    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: outputFolderPath }))
      .on('error', (err) => {
        console.error('Error extracting ZIP:', err)
        reject(err)
      })
      .on('close', () => {
        console.log('Extraction complete')
        resolve(void 0)
      })
  })
}

export function getExecutablePath(dependencyName: string) {
  const dependenciesFolderPath = getDependenciesFolderPath()
  return path.join(dependenciesFolderPath, dependencyName)
}

export function getPlatform(): Platform {
  if (platform.isMacOS) return 'macos'
  if (platform.isWindows) return 'windows'
  return 'linux'
}

interface DownloadProgress {
  downloaded: string
  downloadedBytes: number
  progress: number
  remaining: string
  remainingBytes: number
  speed: string
  speedBytes: number
  total: string
  totalBytes: number
}

interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

interface DownloadInfo {
  url: string
  filePath: string
}

export async function download(url: string, options: DownloadOptions) {
  const downloadPromise = new Promise((resolve, reject) =>
    DownloadManager.download(
      {
        url,
        onProgress: (progress: DownloadProgress) => {
          options.onProgress?.(progress)
        }
      },
      (error, info: { url: string; filePath: string }) => {
        if (error) {
          options.onError?.(error)
          reject(error)
        } else {
          options.onComplete?.()
          resolve(info)
        }
      }
    )
  )

  return await tryCatch<DownloadInfo>(downloadPromise as Promise<DownloadInfo>)
}

export function getFFMPEGPath() {
  return getExecutablePath(platform.isWindows ? 'ffmpeg.exe' : 'ffmpeg')
}

export function getFFPROBEPath() {
  return getExecutablePath(platform.isWindows ? 'ffprobe.exe' : 'ffprobe')
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
  const ffmpegPath = getFFMPEGPath()
  const ffprobePath = getFFPROBEPath()

  if (!ffmpegPath || !ffprobePath) {
    throw new Error('ffmpeg or ffprobe binaries not found')
  }

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
  const ffmpegPath = getFFMPEGPath()

  if (!ffmpegPath) {
    throw new Error('ffmpeg binary not found')
  }

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

export function getDependenciesFolderPath() {
  const dependenciesFolderPath = path.join(app.getPath('home'), '.ShrinkX_Dependencies')
  if (!fs.existsSync(dependenciesFolderPath)) {
    createFolder(dependenciesFolderPath)
  }
  return dependenciesFolderPath
}

export async function installDependencies({
  onProgress,
  onCompleted,
  onError
}: {
  onProgress?: (progress: number) => void
  onCompleted?: () => void
  onError?: (error: string) => void
}) {
  try {
    const dependenciesFolderPath = getDependenciesFolderPath()

    const focusedWindow = BrowserWindow.getFocusedWindow()

    if (!focusedWindow) throw new Error('No focused window found')

    const { missingDependencies } = checkDependencies()

    let shouldLoop = true
    for (let i = 0; i < missingDependencies.length && shouldLoop; i++) {
      const zip = missingDependencies[i]

      const { data: downloadInfo, error } = await download(zip.url, {
        onProgress: (progress) => {
          onProgress?.(
            progress.progress / missingDependencies.length + i * (100 / missingDependencies.length)
          )
        },
        onError: () => {
          shouldLoop = false
          onError?.('Failed to download dependencies')
        }
      })

      if (error) {
        shouldLoop = false
        onError?.(error.message)
        break
      }

      await unzip(downloadInfo.filePath, dependenciesFolderPath)
      deleteFile(downloadInfo.filePath)

      if (zip.executable && platform.isMacOS) {
        await execa('chmod', ['+x', path.join(dependenciesFolderPath, zip.name)])
      }
    }
    onCompleted?.()
  } catch (error) {
    console.error('Failed to install dependencies:', error)
    onError?.('Failed to install dependencies')
  }
}

export function checkDependencies() {
  const dependenciesFolderPath = getDependenciesFolderPath()
  const files = fs.readdirSync(dependenciesFolderPath)
  let missingDependencies = DEPENDENCIES.filter((dep) => {
    return !files.some((file) => file.startsWith(dep.name))
  })

  const platform = getPlatform()

  missingDependencies = missingDependencies.filter((dep) => {
    return dep.platform === platform
  })

  return {
    missingDependencies,
    isInstalled: missingDependencies.length === 0
  }
}

export type ValidateLicenseKeyResponse = {
  data: {
    isValid: boolean
    licenseKey: string
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
    return { data: { ...data, licenseKey }, error: null }
  } catch {
    return {
      data: null,
      error: 'Failed to validate license key'
    }
  }
}
