import React from 'react'
import { CrownIcon, LogOutIcon, MoonIcon, SunIcon } from 'lucide-react'

import { Dialog, DialogTitle, DialogContent, DialogTrigger } from '@renderer/components/ui/dialog'
import LicenseModalContent from '@renderer/components/modals/license-modal-content'
import { useAuth } from '@renderer/context/auth-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { useTheme } from '@renderer/components/theme-provider'

export default function MenuBarDragArea() {
  const [isLicenseModalOpen, setIsLicenseModalOpen] = React.useState(false)

  const { licenseKey, user, logout } = useAuth()

  return (
    <div className="h-10 w-full z-50">
      <div className="flex items-center justify-between gap-2 w-full h-full">
        <div className="pl-20"></div>
        <div
          className="flex-1 flex items-center justify-center h-full"
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
                  onValidated={() => setIsLicenseModalOpen(false)}
                  onSkip={() => setIsLicenseModalOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}

          <ThemeToggle />

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button">
                  <img src={user?.imageUrl} alt={user?.name} className="size-4 rounded-full" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={logout}>
                  <LogOutIcon className="!size-3" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      type="button"
      className="p-1"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? <SunIcon className="size-3" /> : <MoonIcon className="size-3" />}
    </button>
  )
}
