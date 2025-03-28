import { ElectronAPI } from '@electron-toolkit/preload'
import type { ValidateLicenseKeyResponse } from '../main/utils'

type FileStats = {
  name: string
  path: string
  size: number
  isFile: boolean
  isDirectory: boolean
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFileDialog: () => Promise<string[]>
      getFilePath: (file: File) => Promise<string | null>
      getFilesStats: (filePaths: string[]) => Promise<FileStats[]>
      getFilePreview: (filePath: string) => Promise<string | null>
      showItemInFolder: (path: string) => Promise<void>
      removeFile: (path: string) => Promise<void>
      openExternal: (url: string) => Promise<void>
      validateLicenseKey: (licenseKey: string) => Promise<ValidateLicenseKeyResponse>
      checkDependencies: () => Promise<{
        isInstalled: boolean
        missingDependencies: Dependency[]
      }>
      getCurrentVersion: () => Promise<string>
      getLatestRelease: () => Promise<{
        name: string
        version: string
        url: string
      }>
    }
  }
}
