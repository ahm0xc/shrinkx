import React from 'react'
import { FileImage, FileVideo, FileZip, Image, Video } from '@phosphor-icons/react'
import { cn } from './lib/utils'
import { Slider } from '@renderer/components/ui/slider'
import { Switch } from '@renderer/components/ui/switch'
import { Button } from './components/ui/button'

export default function App() {
  const [activeTabIndex, setActiveTabIndex] = React.useState(0)

  const settingsTabs = [
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
  ] as const

  const settings = {
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
  }

  return (
    <main className="grid grid-cols-5 h-[calc(100vh-2.5rem)] overflow-hidden">
      <section className="col-span-3 h-full p-4 pr-2 pt-0">
        <div className="w-full h-full bg-foreground/5 rounded-xl">
          <div className="w-full h-full flex items-center justify-center">
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
          </div>
        </div>
      </section>
      <section className="col-span-2 h-full p-4 pl-2 pt-0">
        <div className="w-full h-full bg-foreground/5 rounded-xl">
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
              <Button className="w-full">Compress</Button>
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
