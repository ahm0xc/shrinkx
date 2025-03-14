import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFileDialog: () => Promise<string[]>
      getFilesStats: (filePaths: string[]) => Promise<
        {
          name: string
          path: string
          size: number
          isFile: boolean
          isDirectory: boolean
        }[]
      >
    }
  }
}
