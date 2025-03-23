import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  getFilePath: (file: File) => webUtils.getPathForFile(file),
  getFilesStats: (filePaths: string[]) => ipcRenderer.invoke('get-files-stats', { filePaths }),
  getFilePreview: (filePath: string) => ipcRenderer.invoke('get-file-preview', { filePath }),
  showItemInFolder: (path: string) => ipcRenderer.invoke('show-item-in-folder', { path }),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', { url }),
  validateLicenseKey: (licenseKey: string) =>
    ipcRenderer.invoke('validate-license-key', { licenseKey }),
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  removeFile: (path: string) => ipcRenderer.invoke('remove-file', { path })
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
