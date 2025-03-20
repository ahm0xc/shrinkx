import React from 'react'
import { CrownIcon } from 'lucide-react'

import { Dialog, DialogTitle, DialogContent, DialogTrigger } from './ui/dialog'
import LicenseModalContent from './modals/license-modal-content'

type User = {
  id: string
  name: string
  email: string
  imageUrl: string
}

export default function MenuBarDragArea() {
  const [isLicenseModalOpen, setIsLicenseModalOpen] = React.useState(false)
  const [licenseKey, setLicenseKey] = React.useState<string | null>(null)
  const [user, setUser] = React.useState<User | null>(null)
  console.log('🚀 ~ MenuBarDragArea ~ user:', user)

  React.useEffect(() => {
    const licenseKey = window.localStorage.getItem('shrinkx-license-key')
    const user = window.localStorage.getItem('shrinkx-user')
    if (licenseKey) {
      setLicenseKey(licenseKey)
    }
    if (user) {
      setUser(JSON.parse(user))
    }
  }, [])

  return (
    <div className="h-10 w-full z-50">
      <div className="flex items-center justify-between gap-2 w-full h-full">
        <div className="pl-20"></div>
        <div
          className="flex-1 flex items-center justify-center"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <p className="text-xs text-foreground/50">Shrink X</p>
        </div>
        <div className="pr-4 flex items-center gap-2">
          {!licenseKey?.length && (
            <Dialog open={isLicenseModalOpen} onOpenChange={setIsLicenseModalOpen}>
              <DialogTrigger asChild>
                <button
                  className="h-5 px-2 rounded bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs flex items-center gap-1"
                  type="button"
                >
                  <CrownIcon className="size-3" />
                  Upgrade to Pro
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle className="sr-only">Upgrade to Pro</DialogTitle>
                <LicenseModalContent
                  onValidated={(licenseKey) => {
                    setLicenseKey(licenseKey)
                    setIsLicenseModalOpen(false)
                  }}
                  onSkip={() => setIsLicenseModalOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}

          {user && (
            <button type="button">
              <img src={user?.imageUrl} alt={user?.name} className="size-4 rounded-full" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
