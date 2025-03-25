import React from 'react'

export default function UpdateNotifier() {
  const [latestRelease, setLatestRelease] = React.useState<{
    name: string
    url: string
  } | null>(null)
  const [currentVersion, setCurrentVersion] = React.useState<string | null>(null)
  console.log('🚀 ~ UpdateNotifier ~ currentVersion:', currentVersion)
  console.log('🚀 ~ UpdateNotifier ~ latestRelease:', latestRelease)

  React.useEffect(() => {
    const checkForUpdates = async () => {
      const latestRelease = await window.api.getLatestRelease()
      setLatestRelease(latestRelease)
    }
    checkForUpdates()
  }, [])

  React.useEffect(() => {
    const getCurrentVersion = async () => {
      const currentVersion = await window.api.getCurrentVersion()
      setCurrentVersion(currentVersion)
    }
    getCurrentVersion()
  }, [])

  if (!latestRelease || !currentVersion) return null

  if (latestRelease.name === `v${currentVersion}`) {
    console.info('No update available')
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 w-[320px] bg-blue-700 dark:bg-blue-600 border rounded-lg p-4">
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-neutral-50 font-medium">
            Update Available <span className="opacity-80">({latestRelease.name})</span>
          </h1>
          <p className="text-neutral-200 text-sm">
            A new version of ShrinkX is available. Please consider upgrading to the latest version.
          </p>
        </div>
        <div className="flex justify-end gap-4">
          <button
            className="h-9 rounded-lg bg-white text-black px-4"
            onClick={() => window.api.openExternal('https://tryshrinkx.com/download')}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  )
}
