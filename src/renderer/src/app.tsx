import React from 'react'
import { FileImage, FileVideo, FileZip, Image, Play, Trash, Video } from '@phosphor-icons/react'
import { useDropzone } from 'react-dropzone'
import { nanoid } from 'nanoid'
import fs from 'fs'
import path from 'path'

import { Slider } from '@renderer/components/ui/slider'
import { Switch } from '@renderer/components/ui/switch'
import { Button } from '@renderer/components/ui/button'
import { cn, formatBytes, getCleanFileName, getFileExtension, truncate } from '@renderer/lib/utils'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif']
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm']

type CustomFile = File & {
  id: string
  isCompressed: boolean
  progress: number
  filetype: 'image' | 'video' | 'archive'
  preview?: string
}

export default function App() {
  const [activeTabIndex, setActiveTabIndex] = React.useState(0)
  const [files, setFiles] = React.useState<CustomFile[]>([])
  const [isCompressing, setIsCompressing] = React.useState(false)

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    const mappedFiles = acceptedFiles.map((file) => ({
      ...file,
      fullPath: fs.realpathSync(path.resolve(file.path)) // Get absolute path
    }))
    console.log('mappedFiles', mappedFiles)

    for (const file of acceptedFiles) {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')

      setFiles((prevFiles) => [
        {
          ...file,
          id: nanoid(),
          name: file.name,
          size: file.size,
          path: file.path,
          isCompressed: false,
          type: file.type,
          filetype: isImage ? 'image' : isVideo ? 'video' : 'archive',
          progress: 0,
          preview: isImage || isVideo ? URL.createObjectURL(file) : undefined
        },
        ...prevFiles
      ])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': IMAGE_EXTENSIONS,
      'video/*': VIDEO_EXTENSIONS
    },
    multiple: true
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
    console.log('compress')
    setIsCompressing(true)
    for (const file of files) {
      await new Promise((resolve, reject) => {
        window.electron.ipcRenderer.invoke('compress-image', { id: file.id, imagePath: file.path })
        window.electron.ipcRenderer.on(`compress-complete-${file.id}`, (_, { outputPath }) => {
          resolve(outputPath)
        })
        window.electron.ipcRenderer.on(`compress-error-${file.id}`, (_, { error }) => {
          reject(error)
        })
      })
    }
  }, [files])

  return (
    <main className="grid grid-cols-5 h-[calc(100vh-2.5rem)] overflow-hidden">
      <section className="col-span-3 h-full p-4 pr-2 pt-0 flex flex-col gap-4">
        <div className="w-full flex-1 bg-foreground/5 rounded-[40px]">
          <div
            {...getRootProps()}
            className={cn(
              'w-full h-full flex items-center border-4 border-dashed border-transparent justify-center flex-col rounded-[inherit]',
              isDragActive && 'border-green-500/50 bg-green-500/10'
            )}
          >
            <input {...getInputProps()} className="hidden" />

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
                      {file.preview && file.filetype === 'image' && (
                        <img src={file.preview} alt={file.name} className="w-10 h-10 rounded-md" />
                      )}
                      {file.preview && file.filetype === 'video' && (
                        <div className="relative">
                          <span className="absolute top-1/2 left-1/2 pointer-events-none -translate-x-1/2 -translate-y-1/2">
                            <Play className="size-3" weight="duotone" />
                          </span>
                          <video
                            src={file.preview}
                            onMouseOver={(e) => e.currentTarget.play()}
                            onMouseOut={(e) => e.currentTarget.pause()}
                            autoPlay={true}
                            muted={true}
                            playsInline={true}
                            className="w-10 h-10 rounded-md bg-primary/5"
                          />
                        </div>
                      )}
                      <div>
                        <p className="text-sm">
                          {truncate(getCleanFileName(file.name), 15)}
                          <span className="text-foreground/50">.{getFileExtension(file.name)}</span>
                        </p>
                        <p className="text-xs text-foreground/50">{formatBytes(file.size)}</p>
                        <div className="bg-primary/5 h-1 rounded-full mt-0.5">
                          <div className="h-full w-[40%] bg-primary rounded-[inherit]" />
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
