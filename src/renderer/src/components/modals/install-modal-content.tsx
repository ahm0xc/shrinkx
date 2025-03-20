import React from 'react'

import Logo from '../logo'
import { Dependency } from '../../../../shared/types'
import { Button } from '../ui/button'

export default function InstallModalContent({
  onInstallCompleted
}: {
  onInstallCompleted: () => void
}) {
  const [installationStatus, setInstallationStatus] = React.useState<
    'pending' | 'installing' | 'completed' | 'error'
  >('pending')
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)
  const [missingDependencies, setMissingDependencies] = React.useState<Dependency[]>([])

  function handleInstallProgress(progress: number) {
    console.log('Install Progress', progress)
    setProgress(progress)
  }

  function handleInstallCompleted() {
    console.log('Install Completed')
    setInstallationStatus('completed')
    window.electron.ipcRenderer.removeAllListeners('install-deps-progress')
    window.electron.ipcRenderer.removeAllListeners('install-deps-completed')
    window.electron.ipcRenderer.removeAllListeners('install-deps-error')
    onInstallCompleted()
  }

  function handleInstallError(error: string) {
    console.error('Install Error', error)
    setError(error)
    setInstallationStatus('error')
    window.electron.ipcRenderer.removeAllListeners('install-deps-progress')
    window.electron.ipcRenderer.removeAllListeners('install-deps-completed')
    window.electron.ipcRenderer.removeAllListeners('install-deps-error')
  }

  async function handleInstall() {
    setError(null)
    setInstallationStatus('installing')

    window.electron.ipcRenderer.send('install-deps')

    const installDepsPromise = new Promise((resolve, reject) => {
      window.electron.ipcRenderer.on('install-deps-progress', (_event, { progress }) => {
        handleInstallProgress(progress)
      })
      window.electron.ipcRenderer.on('install-deps-completed', () => {
        handleInstallCompleted()
        resolve(true)
      })
      window.electron.ipcRenderer.on('install-deps-error', (_event, { error }) => {
        handleInstallError(error)
        reject(error)
      })
    })

    await installDepsPromise
  }

  React.useEffect(() => {
    async function effect() {
      const { missingDependencies } = await window.api.checkDependencies()
      setMissingDependencies(missingDependencies)
    }
    effect()
  }, [])

  const totalSize = missingDependencies.reduce((acc, dep) => acc + dep.size, 0)

  return (
    <section className="flex flex-col gap-4">
      <div className="space-y-2">
        <Logo className="mx-auto size-12" />
        <h1 className="text-lg font-semibold text-center">Install Dependencies</h1>
        <p className="text-sm text-muted-foreground text-center">
          Install the dependencies required to start using ShrinkX.
        </p>
      </div>
      <div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-[12px] text-muted-foreground">
            <p>0MB</p>
            <p>{totalSize}MB</p>
          </div>
          <div>
            <div className="h-0.5 w-full rounded-full bg-secondary">
              <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div>
        <Button
          size="lg"
          disabled={installationStatus === 'installing'}
          className="w-full"
          onClick={handleInstall}
        >
          Install
        </Button>
      </div>
    </section>
  )
}
