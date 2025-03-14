import React from 'react'
import { FileImage, FileVideo, FileZip, Image, Trash, Video } from '@phosphor-icons/react'
import { nanoid } from 'nanoid'
import { FolderIcon } from 'lucide-react'

import { Slider } from '@renderer/components/ui/slider'
import { Switch } from '@renderer/components/ui/switch'
import { Button } from '@renderer/components/ui/button'
import { cn, formatBytes, getCleanFileName, getFileExtension, truncate } from '@renderer/lib/utils'
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '../../shared/config'

type CustomFile = {
  id: string
  name: string
  path: string
  size: number
  isCompressed: boolean
  progress: number
  filetype: 'image' | 'video' | 'unknown'
  outputPath?: string
  preview?: string
}

export default function App() {
  const [activeTabIndex, setActiveTabIndex] = React.useState(0)
  const [files, setFiles] = React.useState<CustomFile[]>([])
  const [isCompressing, setIsCompressing] = React.useState(false)

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
        },
        {
          id: 'archive',
          label: 'Archive',
          icon: FileZip
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
              <Slider defaultValue={[75]} max={100} min={1} step={25} />
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
              <select className="w-36 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50">
                <option value="same">Same as input</option>
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
                <option value="avif">AVIF</option>
              </select>
            </div>
          )
        },
        {
          title: 'Remove input file',
          description: 'Remove the input file after compression.',
          wrapper: 'flex items-center gap-2 justify-between',
          component: (
            <div>
              <Switch />
            </div>
          )
        }
      ],
      video: [],
      archive: []
    }),
    []
  )

  const onRemoveFile = React.useCallback((file: CustomFile) => {
    setFiles((prevFiles) => prevFiles.filter((f) => f.id !== file.id))
  }, [])

  const handleCompress = React.useCallback(async () => {
    setIsCompressing(true)
    const sortedFiles = files.sort((a, b) => {
      if (a.filetype === 'image' && b.filetype !== 'image') return -1
      if (a.filetype !== 'image' && b.filetype === 'image') return 1
      return 0
    })

    for (const file of sortedFiles) {
      await new Promise(async (resolve, reject) => {
        try {
          if (file.filetype === 'image') {
            window.electron.ipcRenderer.send('compress-image', {
              id: file.id,
              path: file.path
            })
            window.electron.ipcRenderer.on(
              `compress-image-complete-${file.id}`,
              (_, { outputPath }) => {
                resolve(outputPath)
                setFiles((prevFiles) =>
                  prevFiles.map((f) => (f.id === file.id ? { ...f, outputPath, progress: 100 } : f))
                )
              }
            )
            window.electron.ipcRenderer.on(`compress-image-error-${file.id}`, (_, { error }) => {
              reject(error)
            })
            window.electron.ipcRenderer.on(
              `compress-image-progress-${file.id}`,
              (_, { progress }) => {
                setFiles((prevFiles) =>
                  prevFiles.map((f) => (f.id === file.id ? { ...f, progress } : f))
                )
              }
            )
            resolve(true)
          } else if (file.filetype === 'video') {
            window.electron.ipcRenderer.send('compress-video', {
              id: file.id,
              path: file.path
            })
            window.electron.ipcRenderer.on(
              `compress-video-complete-${file.id}`,
              (_, { outputPath }) => {
                resolve(outputPath)
                setFiles((prevFiles) =>
                  prevFiles.map((f) => (f.id === file.id ? { ...f, outputPath, progress: 100 } : f))
                )
              }
            )
            window.electron.ipcRenderer.on(`compress-video-error-${file.id}`, (_, { error }) => {
              reject(error)
            })
            window.electron.ipcRenderer.on(
              `compress-video-progress-${file.id}`,
              (_, { progress }) => {
                setFiles((prevFiles) =>
                  prevFiles.map((f) => (f.id === file.id ? { ...f, progress } : f))
                )
              }
            )
            resolve(true)
          }
        } catch (error) {
          reject(error)
        }
      })
    }
    setIsCompressing(false)
  }, [files])

  async function openFileDialog() {
    const filePaths = await window.api.openFileDialog()
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

  const openFolder = React.useCallback((file: CustomFile) => {
    if (!file.outputPath) return
    console.log('opening...', file.outputPath)
    window.api.showItemInFolder(file.outputPath)
  }, [])

  return (
    <main className="grid grid-cols-5 h-[calc(100vh-2.5rem)] overflow-hidden">
      <section className="col-span-3 h-full p-4 pr-2 pt-0 flex flex-col gap-4">
        <div className="w-full flex-1 bg-foreground/5 rounded-[40px]">
          <div
            className={cn(
              'w-full h-full flex items-center border-4 border-dashed border-transparent justify-center flex-col rounded-[inherit]'
              // isDragActive && 'border-green-500/50 bg-green-500/10'
            )}
          >
            <div className="flex gap-0 text-foreground/50">
              <FileImage
                className="-rotate-12 w-[10vw] h-[10vw] translate-x-1/4"
                weight="regular"
              />
              <FileZip className="rotate-0 w-[10vw] h-[10vw]" weight="regular" />
              <FileVideo
                className="rotate-12 w-[10vw] h-[10vw] -translate-x-1/4"
                weight="regular"
              />
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
                    <div className="flex items-center gap-2 bg-foreground/10 rounded-md p-2 min-w-[220px] relative group">
                      <button
                        type="button"
                        className="h-5 w-5 bg-primary text-primary-foreground rounded-full flex justify-center items-center absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        onClick={() => onRemoveFile(file)}
                      >
                        <Trash className="size-3" weight="duotone" />
                      </button>
                      <div className="relative">
                        {file.preview && (
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="w-10 h-10 rounded-md bg-primary/5"
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
                      <div>
                        <p className="text-sm">
                          {truncate(getCleanFileName(file.name), 15)}
                          <span className="text-foreground/50">.{getFileExtension(file.name)}</span>
                        </p>
                        <p className="text-xs text-foreground/50">{formatBytes(file.size)}</p>
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
  )
}
