import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { basename, join, extname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import * as fs from 'fs'
import DownloadManager from 'electron-download-manager'

import {
  checkDependencies,
  compressImage,
  compressVideo,
  getDependenciesFolderPath,
  getImagePreview,
  getVideoPreview,
  installDependencies,
  validateLicenseKey
} from './utils'
import icon from '../../resources/icon.png?asset'
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, ALL_EXTENSIONS } from '../shared/config'

DownloadManager.register({
  downloadFolder: getDependenciesFolderPath()
})

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    titleBarOverlay: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.shrinkx.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        // { name: 'Images', extensions: IMAGE_EXTENSIONS },
        // { name: 'Videos', extensions: VIDEO_EXTENSIONS },
        { name: 'All Supported Files', extensions: ALL_EXTENSIONS }
      ]
    })

    return result.filePaths
  })

  ipcMain.handle('get-files-stats', async (_event, { filePaths }) => {
    const stats = await Promise.all(
      filePaths.map((filePath) => {
        const stats = fs.statSync(filePath)
        return {
          name: basename(filePath),
          path: filePath,
          size: stats.size,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory()
        }
      })
    )
    return stats
  })

  ipcMain.handle('get-file-preview', async (_event, { filePath }) => {
    const fileExtension = extname(filePath).split('.')[1]
    const isVideo = VIDEO_EXTENSIONS.includes(fileExtension)
    const isImage = IMAGE_EXTENSIONS.includes(fileExtension)

    if (isVideo) {
      return await getVideoPreview(filePath)
    }

    if (isImage) {
      return await getImagePreview(filePath)
    }

    return null
  })

  ipcMain.handle('remove-file', async (_event, { path }) => {
    fs.unlinkSync(path)
  })

  ipcMain.handle('show-item-in-folder', async (_event, { path }) => {
    shell.showItemInFolder(path)
  })

  ipcMain.handle('open-external', async (_event, { url }) => {
    console.log('open-external', { url })
    shell.openExternal(url)
  })

  ipcMain.handle('validate-license-key', async (_event, { licenseKey }) => {
    return await validateLicenseKey(licenseKey)
  })

  ipcMain.handle('check-dependencies', async () => {
    return await checkDependencies()
  })

  ipcMain.on('compress-image', async (event, { id, path, settings }) => {
    console.log('compress-image', { id, path, settings })
    try {
      await compressImage(path, {
        settings,
        onProgress: (progress) => {
          event.sender.send(`compress-image-progress-${id}`, { progress })
        },
        onComplete: (result) => {
          event.sender.send(`compress-image-complete-${id}`, result)
        }
      })
    } catch (error) {
      event.sender.send(`compress-image-error-${id}`, { error })
    }
  })

  ipcMain.on('compress-video', async (event, { id, path, settings }) => {
    console.log('compress-video', { id, path, settings })
    try {
      await compressVideo(path, {
        settings,
        onProgress: (progress) => {
          event.sender.send(`compress-video-progress-${id}`, { progress })
        },
        onComplete: (result) => {
          event.sender.send(`compress-video-complete-${id}`, result)
        }
      })
    } catch (error) {
      event.sender.send(`compress-video-error-${id}`, { error })
    }
  })

  ipcMain.on('install-deps', async (event) => {
    try {
      await installDependencies({
        onProgress: (progress) => {
          console.log('🚀 ~ ipcMain.on ~ progress:', progress)
          event.sender.send('install-deps-progress', { progress })
        },
        onCompleted: () => {
          console.log('🚀 ~ ipcMain.on ~ completed')
          event.sender.send('install-deps-completed')
        },
        onError: (error) => {
          console.log('Deps installation canceled')
          event.sender.send('install-deps-error', { error })
        }
      })
    } catch (error) {
      console.error('Error installing dependencies:', error)
      event.sender.send('install-deps-error', { error })
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
