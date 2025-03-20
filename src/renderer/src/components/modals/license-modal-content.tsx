import React from 'react'

import { validateLicenseKey } from '@renderer/lib/utils'
import Logo from '@renderer/components/logo'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@renderer/components/ui/input-otp'
import { Button } from '@renderer/components/ui/button'
import { useAuth } from '@renderer/context/auth-context'

export default function LicenseModalContent({
  onValidated,
  onSkip
}: {
  onValidated: (licenseKey: string) => void
  onSkip: () => void
}) {
  const [licenseKey, setLicenseKey] = React.useState('')
  const [isValidating, setIsValidating] = React.useState(false)
  const [validationError, setValidationError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const { setLicenseKey: setLocalLicenseKey, setUser: setLocalUser } = useAuth()

  async function handleActivation() {
    if (!licenseKey) {
      setValidationError('License key is required')
      return
    }
    if (licenseKey.length !== 16) {
      setValidationError('Invalid license key')
      return
    }
    setIsValidating(true)
    setValidationError(null)
    const { data, error } = await validateLicenseKey(licenseKey)
    setIsValidating(false)
    if (error) {
      console.error(error)
      setValidationError(error)
      return
    }
    if (data?.isValid) {
      setLocalLicenseKey(data.licenseKey)
      setLocalUser(data.user)
      onValidated(licenseKey)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="space-y-2">
        <Logo className="mx-auto size-12" />
        <h1 className="text-lg font-semibold text-center">License</h1>
        <p className="text-sm text-muted-foreground text-center text-balance">
          Please enter your license key to continue. Don&apos;t have a license?{' '}
          <span
            className="text-primary cursor-pointer hover:underline"
            onClick={() => window.api.openExternal('https://shrinkx.vercel.app/pricing')}
          >
            Buy one.
          </span>
        </p>
      </div>
      <div className="w-fit mx-auto">
        <InputOTP
          maxLength={16}
          value={licenseKey}
          onChange={setLicenseKey}
          onComplete={handleActivation}
          disabled={isValidating}
          autoFocus
          ref={inputRef}
        >
          <InputOTPGroup>
            <InputOTPSlot className="h-8 w-7" index={0} />
            <InputOTPSlot className="h-8 w-7" index={1} />
            <InputOTPSlot className="h-8 w-7" index={2} />
            <InputOTPSlot className="h-8 w-7" index={3} />
          </InputOTPGroup>
          <InputOTPGroup>
            <InputOTPSlot className="h-8 w-7" index={4} />
            <InputOTPSlot className="h-8 w-7" index={5} />
            <InputOTPSlot className="h-8 w-7" index={6} />
            <InputOTPSlot className="h-8 w-7" index={7} />
          </InputOTPGroup>
          <InputOTPGroup>
            <InputOTPSlot className="h-8 w-7" index={8} />
            <InputOTPSlot className="h-8 w-7" index={9} />
            <InputOTPSlot className="h-8 w-7" index={10} />
            <InputOTPSlot className="h-8 w-7" index={11} />
          </InputOTPGroup>
          <InputOTPGroup>
            <InputOTPSlot className="h-8 w-7" index={12} />
            <InputOTPSlot className="h-8 w-7" index={13} />
            <InputOTPSlot className="h-8 w-7" index={14} />
            <InputOTPSlot className="h-8 w-7" index={15} />
          </InputOTPGroup>
        </InputOTP>
        <p className="text-red-500 text-sm mt-1">{validationError}</p>
      </div>
      <div className="flex flex-col gap-2 items-center">
        <Button size="lg" className="w-full" onClick={handleActivation}>
          {isValidating ? 'Validating...' : 'Activate'}
        </Button>
        <Button variant="link" className="text-muted-foreground" onClick={onSkip}>
          skip for now
        </Button>
      </div>
    </section>
  )
}
