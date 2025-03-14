import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { basename, join, extname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { statSync } from 'fs'

import { compressImage, getImagePreview, getVideoPreview } from './utils'

import icon from '../../resources/icon.png?asset'
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '../shared/config'

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
      contextIsolation: false,
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
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: IMAGE_EXTENSIONS },
        { name: 'Videos', extensions: VIDEO_EXTENSIONS }
      ]
    })

    return result.filePaths
  })

  ipcMain.handle('get-files-stats', async (_event, { filePaths }) => {
    const stats = await Promise.all(
      filePaths.map((filePath) => {
        const stats = statSync(filePath)
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

  ipcMain.handle('compress-image', async (event, { id, imagePath }) => {
    console.log('compress-image', { id, imagePath })
    try {
      await compressImage(imagePath, {
        onProgress: (progress) => {
          console.log('🚀 ~ ipcMain.handle ~ progress:', progress)
          event.sender.send(`compress-progress-${id}`, { progress })
        },
        onComplete: (compressedImagePath) => {
          console.log('🚀 ~ ipcMain.handle ~ compressedImagePath:', compressedImagePath)
          event.sender.send(`compress-complete-${id}`, { outputPath: compressedImagePath })
        }
      })
    } catch (error) {
      event.sender.send(`compress-error-${id}`, { error })
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
