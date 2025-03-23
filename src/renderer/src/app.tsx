import React from 'react'
import { FileImage, FileVideo, FileArchive as FileZip, Image, Trash, Video } from 'lucide-react'
import { nanoid } from 'nanoid'
import { CircleEllipsisIcon, FolderIcon } from 'lucide-react'
import useLocalStorage from 'use-local-storage'

import { Slider } from '@renderer/components/ui/slider'
import { Switch } from '@renderer/components/ui/switch'
import { Button, buttonVariants } from '@renderer/components/ui/button'
import { cn, formatBytes, getCleanFileName, getFileExtension, truncate } from '@renderer/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'

import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '../../shared/config'
import { CompressionSettings } from '../../shared/types'
import OnBoardingModal from './components/modals/onboarding-modal'

type CustomFile = {
  id: string
  name: string
  size: number
  isCompressed: boolean
  progress: number
  filetype: 'image' | 'video' | 'unknown'
  path?: string
  compressionStats?: {
    size: number
    timeTook: number
  }
  outputPath?: string
  preview?: string
}

export default function App() {
  const [activeTabIndex, setActiveTabIndex] = React.useState(0)
  const [files, setFiles] = React.useState<CustomFile[]>([])
  const [isCompressing, setIsCompressing] = React.useState(false)
  const [settingsConfig, setSettingsConfig] = useLocalStorage<CompressionSettings>('settings', {
    image: {
      compressionQuality: 75,
      outputFormat: 'preserve',
      replaceInputFile: false
    },
    video: {
      resolution: 'preserve',
      compressionQuality: 25,
      speed: 'default',
      replaceInputFile: false,
      removeAudio: false
    }
  })

  const settingsTabs = React.useMemo(
    () =>
      [
        {
          id: 'image',
          label: 'Image',
          icon: Image
        },
        {
          id: 'video',
          label: 'Video',
          icon: Video
        }
      ] as const,
    []
  )

  const settings = React.useMemo(
    () => ({
      image: [
        {
          title: 'Compression Quality',
          description: 'Adjust the compression quality. Higher quality means better compression.',
          component: (
            <div className="flex items-center gap-2">
              <p className="text-sm text-foreground/50">low</p>
              <Slider
                value={[settingsConfig.image.compressionQuality]}
                max={100}
                min={0}
                step={25}
                onValueChange={(value) =>
                  setSettingsConfig(
                    (prev) =>
                      ({
                        ...prev!,
                        image: { ...prev!.image, compressionQuality: value[0] ?? 0 }
                      }) as CompressionSettings
                  )
                }
              />
              <p className="text-sm text-foreground/50">high</p>
            </div>
          )
        },
        {
          title: 'Output Format',
          description: 'Select the output format.',
          wrapper: 'flex items-center gap-2 justify-between',
          component: (
            <div>
              <select
                className="w-36 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                value={settingsConfig.image.outputFormat}
                onChange={(e) =>
                  setSettingsConfig(
                    (prev) =>
                      ({
                        ...prev!,
                        image: {
                          ...prev!.image,
                          outputFormat: e.target.value as 'preserve' | 'png' | 'jpeg'
                        }
                      }) as CompressionSettings
                  )
                }
              >
                <option value="preserve">Same as input</option>
                <option value="png" disabled>
                  PNG
                </option>
                <option value="jpg" disabled>
                  JPG
                </option>
              </select>
            </div>
          )
        },
        {
          title: 'Replace input file',
          description: 'Replace the input file with the compressed file.',
          wrapper: 'flex items-center gap-2 justify-between',
          component: (
            <div>
              <Switch
                checked={settingsConfig.image.replaceInputFile}
                onCheckedChange={(checked) =>
                  setSettingsConfig(
                    (prev) =>
                      ({
                        ...prev!,
                        image: { ...prev!.image, replaceInputFile: checked }
                      }) as CompressionSettings
                  )
                }
              />
            </div>
          )
        }
      ],
      video: [
        {
          title: 'Resolution',
          description: 'Select the resolution of the video.',
          wrapper: 'flex items-center gap-2 justify-between',
          component: (
            <div>
              <select
                className="w-36 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                value={settingsConfig.video.resolution}
                onChange={(e) =>
                  setSettingsConfig(
                    (prev) =>
                      ({
                        ...prev!,
                        video: {
                          ...prev!.video,
                          resolution: e.target.value as
                            | 'preserve'
                            | '1920:1080'
                            | '1280:720'
                            | '854:480'
                            | '640:360'
                        }
                      }) as CompressionSettings
                  )
                }
              >
                <option value="preserve">Same as input</option>
                <option value="1920:1080">1080p</option>
                <option value="1280:720">720p</option>
                <option value="854:480">480p</option>
                <option value="640:360">360p</option>
              </select>
            </div>
          )
        },
        {
          title: 'Speed',
          description: 'Faster compression speed means less quality.',
          wrapper: 'flex items-center gap-2 justify-between',
          component: (
            <div>
              <select
                className="w-36 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                value={settingsConfig.video.speed}
                onChange={(e) =>
                  setSettingsConfig(
                    (prev) =>
                      ({
                        ...prev!,
                        video: {
                          ...prev!.video,
                          speed: e.target.value as CompressionSettings['video']['speed']
                        }
                      }) as CompressionSettings
                  )
                }
              >
                <option value="default">Default</option>
                <option value="superfast">Fast</option>
                <option value="veryfast">Medium</option>
                <option value="veryslow">Slow</option>
              </select>
            </div>
          )
        },
        {
          title: 'Compression Quality',
          description: 'Adjust the compression quality. Higher quality means better compression.',
          component: (
            <div className="flex items-center gap-2">
              <p className="text-sm text-foreground/50">low</p>
              <Slider
                value={[settingsConfig.video.compressionQuality]}
                max={100}
                min={0}
                step={25}
                onValueChange={(value) =>
                  setSettingsConfig(
                    (prev) =>
                      ({
                        ...prev!,
                        video: { ...prev!.video, compressionQuality: value[0] ?? 0 }
                      }) as CompressionSettings
                  )
                }
              />
              <p className="text-sm text-foreground/50">high</p>
            </div>
          )
        },
        {
          title: 'Remove audio',
          description: 'Remove the audio from the video.',
          wrapper: 'flex items-center gap-2 justify-between',
          component: (
            <div>
              <Switch
                checked={settingsConfig.video.removeAudio}
                onCheckedChange={(checked) =>
                  setSettingsConfig(
                    (prev) =>
                      ({
                        ...prev!,
                        video: { ...prev!.video, removeAudio: checked }
                      }) as CompressionSettings
                  )
                }
              />
            </div>
          )
        },
        {
          title: 'Replace input file',
          description: 'Replace the input file with the compressed file.',
          wrapper: 'flex items-center gap-2 justify-between',
          component: (
            <div>
              <Switch
                checked={settingsConfig.video.replaceInputFile}
                onCheckedChange={(checked) =>
                  setSettingsConfig(
                    (prev) =>
                      ({
                        ...prev!,
                        video: { ...prev!.video, replaceInputFile: checked }
                      }) as CompressionSettings
                  )
                }
              />
            </div>
          )
        }
      ]
    }),
    [settingsConfig]
  )

  const onRemoveFile = React.useCallback((file: CustomFile) => {
    setFiles((prevFiles) => prevFiles.filter((f) => f.id !== file.id))
  }, [])

  const updateFileProgress = React.useCallback((fileId: string, progress: number) => {
    setFiles((prevFiles) => prevFiles.map((f) => (f.id === fileId ? { ...f, progress } : f)))
  }, [])

  const updateFileCompressionComplete = React.useCallback(
    async (
      fileId: string,
      { outputPath, size, timeTook }: { outputPath: string; size: number; timeTook: number }
    ) => {
      try {
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  outputPath,
                  progress: 100,
                  isCompressed: true,
                  compressionStats: {
                    size,
                    timeTook
                  }
                }
              : f
          )
        )
      } catch (error) {
        console.error('Error getting file stats:', error)
      }
    },
    []
  )

  const compressFile = React.useCallback(
    async (file: CustomFile): Promise<void> => {
      return new Promise(async (resolve, reject) => {
        try {
          if (!file.path) {
            reject(new Error(`No path found for file: ${file.name}`))
            return
          }

          const compressionType = file.filetype
          const eventBase = `compress-${compressionType}`

          // Setup all event listeners before triggering compression
          const onCompleteListener = async (
            _event: Electron.IpcRendererEvent,
            { outputPath, size, timeTook }: { outputPath: string; size: number; timeTook: number }
          ) => {
            await updateFileCompressionComplete(file.id, { outputPath, size, timeTook })
            window.electron.ipcRenderer.removeAllListeners(`${eventBase}-complete-${file.id}`)
            window.electron.ipcRenderer.removeAllListeners(`${eventBase}-error-${file.id}`)
            window.electron.ipcRenderer.removeAllListeners(`${eventBase}-progress-${file.id}`)
            resolve()
          }

          const onErrorListener = (
            _event: Electron.IpcRendererEvent,
            { error }: { error: Error }
          ) => {
            console.error(`Error compressing ${compressionType}:`, error)
            window.electron.ipcRenderer.removeAllListeners(`${eventBase}-complete-${file.id}`)
            window.electron.ipcRenderer.removeAllListeners(`${eventBase}-error-${file.id}`)
            window.electron.ipcRenderer.removeAllListeners(`${eventBase}-progress-${file.id}`)
            reject(error)
          }

          const onProgressListener = (
            _event: Electron.IpcRendererEvent,
            { progress }: { progress: number }
          ) => {
            updateFileProgress(file.id, progress)
          }

          // Register event listeners
          window.electron.ipcRenderer.on(`${eventBase}-complete-${file.id}`, onCompleteListener)
          window.electron.ipcRenderer.on(`${eventBase}-error-${file.id}`, onErrorListener)
          window.electron.ipcRenderer.on(`${eventBase}-progress-${file.id}`, onProgressListener)

          // Start compression
          window.electron.ipcRenderer.send(`compress-${compressionType}`, {
            id: file.id,
            path: file.path,
            settings: settingsConfig[compressionType]
          })
        } catch (error) {
          reject(error)
        }
      })
    },
    [updateFileProgress, updateFileCompressionComplete, settingsConfig]
  )

  const handleCompress = React.useCallback(async () => {
    setIsCompressing(true)

    try {
      // Sort files to prioritize images
      const sortedFiles = [...files].sort((a, b) => {
        if (a.filetype === 'image' && b.filetype !== 'image') return -1
        if (a.filetype !== 'image' && b.filetype === 'image') return 1
        return 0
      })

      // Filter for uncompressed files
      const filesToCompress = sortedFiles.filter((file) => !file.isCompressed)

      // Process files sequentially
      for (const file of filesToCompress) {
        await compressFile(file)
      }
    } catch (error) {
      console.error('Compression failed:', error)
    } finally {
      setIsCompressing(false)
    }
  }, [files, compressFile])

  async function processFiles(filePaths: string[]) {
    const fileStats = await window.api.getFilesStats(filePaths)
    const filePreviews = await Promise.all(
      fileStats.map((stat) => window.api.getFilePreview(stat.path))
    )

    const newFiles: CustomFile[] = fileStats.map((stat, index) => {
      const extension = getFileExtension(stat.name)
      const isImage = IMAGE_EXTENSIONS.includes(extension ?? '')
      const isVideo = VIDEO_EXTENSIONS.includes(extension ?? '')

      return {
        id: nanoid(),
        name: stat.name,
        path: stat.path,
        size: stat.size,
        isCompressed: false,
        progress: 0,
        filetype: isImage ? 'image' : isVideo ? 'video' : 'unknown',
        preview: filePreviews[index] ?? undefined
      }
    })

    setFiles((prevFiles) => [...newFiles, ...prevFiles])
  }

  async function openFileDialog() {
    const filePaths = await window.api.openFileDialog()
    await processFiles(filePaths)
  }

  const openFolder = React.useCallback((file: CustomFile) => {
    if (!file.outputPath) return
    console.log('opening...', file.outputPath)
    window.api.showItemInFolder(file.outputPath)
  }, [])

  const handleRemoveOriginal = React.useCallback((file: CustomFile) => {
    if (!file.path) return
    console.log('removing...', file.path)
    window.api.removeFile(file.path)
  }, [])

  React.useEffect(() => {
    function preventDefaults(e: Event) {
      e.preventDefault()
      e.stopPropagation()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function handleDrop(e: any) {
      e.preventDefault()
      e.stopPropagation()

      const files = e.dataTransfer?.files

      const filePaths: string[] = []
      for (const file of files) {
        const filePath = await window.api.getFilePath(file)
        if (filePath) filePaths.push(filePath)
      }

      await processFiles(filePaths)
    }

    const events = ['dragenter', 'dragover', 'dragleave', 'drop']

    events.forEach((eventName) => {
      document.body.addEventListener(eventName, preventDefaults, false)
    })

    document.body.addEventListener('drop', handleDrop, false)

    return () => {
      events.forEach((eventName) => {
        document.body.removeEventListener(eventName, preventDefaults, false)
      })

      document.body.removeEventListener('drop', handleDrop, false)
    }
  }, [])

  return (
    <React.Fragment>
      <OnBoardingModal />
      <main className="grid grid-cols-5 h-[calc(100vh-2.5rem)] overflow-hidden">
        <section className="col-span-3 h-full p-4 pr-2 pt-0 flex flex-col gap-4">
          <div className="w-full flex-1 bg-foreground/5 rounded-[40px]">
            <div
              className={cn(
                'w-full h-full flex items-center border-4 border-dashed border-transparent justify-center flex-col rounded-[inherit]'
                // isDragActive && 'border-green-500/50 bg-green-500/10'
              )}
            >
              <div className="flex gap-0 text-foreground">
                <FileImage className="-rotate-12 w-[10vw] h-[10vw] translate-x-1/4" />
                <FileZip className="rotate-0 w-[10vw] h-[10vw]" />
                <FileVideo className="rotate-12 w-[10vw] h-[10vw] -translate-x-1/4" />
              </div>
              <p className="text-sm text-foreground/50 mt-4">Drop files here or click to upload</p>
              <Button onClick={openFileDialog} className="w-fit mt-4">
                Select files
              </Button>
            </div>
          </div>
          {files.length !== 0 && (
            <div
              aria-label="uploaded-file-preview-area"
              className="p-4 gap-2 h-[50vh] overflow-y-auto bg-foreground/5 rounded-[40px]"
            >
              <div className="flex flex-wrap gap-2">
                {files.map((file) => {
                  return (
                    <div key={file.id}>
                      <div className="flex items-center gap-2 bg-foreground/10 rounded-md p-2 min-w-[200px] relative group">
                        <div className="relative">
                          {file.preview && (
                            <img
                              src={file.preview}
                              alt={file.name}
                              className="w-12 h-12 rounded-md bg-primary/5 object-cover"
                            />
                          )}
                          {file.outputPath && (
                            <button
                              type="button"
                              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md p-3"
                              onClick={() => openFolder(file)}
                              title="Open folder"
                            >
                              <FolderIcon className="size-4" />
                            </button>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            {truncate(getCleanFileName(file.name), 12)}
                            <span className="text-foreground/50">
                              .{getFileExtension(file.name)}
                            </span>
                          </p>
                          <p className="text-xs text-foreground/50 flex gap-2">
                            <span className={cn(file.compressionStats?.size && 'line-through')}>
                              {formatBytes(file.size)}
                            </span>
                            <span
                              className={cn(
                                'hidden',
                                file.compressionStats?.size && 'block text-green-500'
                              )}
                            >
                              {formatBytes(file.compressionStats?.size ?? 0)}
                            </span>
                            {file.compressionStats?.timeTook && (
                              <span className="text-foreground/50 text-xs">
                                took {(file.compressionStats.timeTook / 1000 / 60).toFixed(1)}m
                              </span>
                            )}
                          </p>
                          <div className="bg-primary/5 h-1 rounded-full mt-0.5">
                            <div
                              className={cn(
                                'h-full bg-primary rounded-[inherit]',
                                file.progress === 0 && 'opacity-0',
                                file.progress > 0 && 'opacity-100',
                                file.progress === 100 && 'bg-green-500'
                              )}
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                        <div className="ml-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className={cn(
                                  'pointer-events-none opacity-0 text-muted-foreground',
                                  file.isCompressed && 'opacity-100 pointer-events-auto'
                                )}
                              >
                                <CircleEllipsisIcon className="size-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => openFolder(file)}>
                                <FolderIcon className="size-4" />
                                Open folder
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className={cn(buttonVariants({ variant: 'destructive' }))}
                                onClick={() => handleRemoveOriginal(file)}
                              >
                                <Trash className="size-4" />
                                Remove Original
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <button
                          type="button"
                          className="h-5 w-5 bg-primary text-primary-foreground rounded-full flex justify-center items-center absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          onClick={() => onRemoveFile(file)}
                        >
                          <Trash className="size-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
        <section className="col-span-2 h-full p-4 pl-2 pt-0">
          <div className="w-full h-full bg-foreground/5 rounded-[40px]">
            <div className="w-full h-full p-6 gap-4 flex flex-col">
              <div aria-label="settings-title">
                <h2 className="font-medium">Settings</h2>
                <p className="text-sm text-foreground/50">
                  Configure your settings to customize compression behavior.
                </p>
              </div>
              <div aria-label="settings-tab-bar">
                <div className="flex items-center w-full bg-foreground/5 rounded-full h-11 border p-1">
                  {settingsTabs.map((tab, index) => (
                    <button
                      key={tab.label}
                      className={cn(
                        'flex items-center gap-2 flex-1 justify-center h-full rounded-full',
                        index === activeTabIndex && 'bg-foreground/10'
                      )}
                      onClick={() => setActiveTabIndex(index)}
                    >
                      <tab.icon />
                      <p>{tab.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div
                aria-label="settings-tab-content"
                className="space-y-6 max-h-[calc(100vh-10rem)] overflow-y-auto"
              >
                {settings[settingsTabs[activeTabIndex].id].map((setting) => (
                  <div key={setting.title} className={setting.wrapper}>
                    <div>
                      <h3 className="text-sm font-medium">{setting.title}</h3>
                      <p className="text-sm text-foreground/50 mt-1">{setting.description}</p>
                    </div>
                    <div className="mt-4">{setting.component}</div>
                  </div>
                ))}
              </div>
              <div aria-label="settings-footer" className="mt-auto">
                <Button className="w-full" disabled={isCompressing} onClick={handleCompress}>
                  Compress
                </Button>
                <p className="text-sm text-foreground/50 text-center mt-2">
                  Estimated time: ~2 minutes
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </React.Fragment>
  )
}
