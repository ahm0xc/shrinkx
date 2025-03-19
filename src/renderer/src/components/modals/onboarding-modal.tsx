import * as React from 'react'
import { ReactCompareSlider } from 'react-compare-slider'

import Logo from '@renderer/components/logo'
import { Dialog, DialogContent, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@renderer/components/ui/input-otp'
import { validateLicenseKey } from '@renderer/lib/utils'

const steps = [
  {
    id: 'welcome',
    component: WelcomeStep
  },
  // {
  //   id: 'install',
  //   component: InstallStep
  // },
  {
    id: 'license',
    component: LicenseStep
  }
]

export default function OnBoardingModal() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(steps[0])

  function handleNextStep() {
    const currentStepIndex = steps.findIndex((step) => step.id === currentStep.id)
    const nextStepIndex = currentStepIndex + 1
    const hasNextStep = nextStepIndex < steps.length
    if (hasNextStep) {
      setCurrentStep(steps[nextStepIndex])
    } else {
      window.localStorage.setItem('shrinkx-onboarding-completed', 'true')
      setIsOpen(false)
    }
  }

  React.useEffect(() => {
    const isCompleted = window.localStorage.getItem('shrinkx-onboarding-completed')
    if (!isCompleted) {
      setIsOpen(true)
    }
  }, [])

  const CurrentStepComponent = currentStep.component

  return (
    <Dialog open={isOpen}>
      <DialogContent hasCloseButton={false} className="max-w-xl">
        <DialogTitle className="sr-only">Onboarding</DialogTitle>
        <CurrentStepComponent onNextStep={handleNextStep} />
      </DialogContent>
    </Dialog>
  )
}

function WelcomeStep({ onNextStep }: { onNextStep: () => void }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="space-y-2">
        <Logo className="mx-auto size-12" />
        <h1 className="text-lg font-semibold text-center">Welcome to ShrinkX</h1>
        <p className="text-sm text-muted-foreground text-center">
          ShrinkX is a tool that helps you compress medias easily.
        </p>
      </div>
      <div>
        <ReactCompareSlider
          itemOne={
            <div className="relative">
              <div className="absolute top-2 left-2 px-3 py-2 rounded-xl bg-white/10 border-white/20 backdrop-blur-lg">
                Original: 4.1mb
              </div>
              <img
                src="https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&dl=vincentiu-solomon-ln5drpv_ImI-unsplash.jpg&w=640"
                alt=""
                className="h-auto w-full object-cover rounded-lg aspect-video"
              />
            </div>
          }
          itemTwo={
            <div className="relative">
              <div className="absolute top-2 right-2 px-3 py-2 rounded-xl bg-white/10 border-white/20 backdrop-blur-lg">
                Compressed: 509kb
              </div>
              <img
                src="https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&dl=vincentiu-solomon-ln5drpv_ImI-unsplash.jpg&w=640"
                alt=""
                className="h-auto w-full object-cover rounded-lg aspect-video"
              />
            </div>
          }
        />
      </div>
      <div>
        <Button size="lg" className="w-full" onClick={onNextStep}>
          Continue
        </Button>
      </div>
    </section>
  )
}

// function InstallStep({ onNextStep }: { onNextStep: () => void }) {
//   const [installationStatus, setInstallationStatus] = React.useState<
//     'pending' | 'installing' | 'completed' | 'error'
//   >('pending')

//   const [progress, setProgress] = React.useState(0)

//   async function handleInstall() {
//     window.electron.ipcRenderer.send('install-deps')
//     setInstallationStatus('installing')
//     const installDepsPromise = new Promise((resolve, reject) => {
//       window.electron.ipcRenderer.on('install-deps-progress', (_event, { progress }) => {
//         console.log('Progress', progress)
//         setProgress(progress.percent * 100)
//       })
//       window.electron.ipcRenderer.on('install-deps-completed', (_event, { file }) => {
//         console.log('Completed', file)
//         setInstallationStatus('completed')
//         window.electron.ipcRenderer.removeAllListeners('install-deps-progress')
//         window.electron.ipcRenderer.removeAllListeners('install-deps-completed')
//         window.electron.ipcRenderer.removeAllListeners('install-deps-error')
//         resolve(file)
//       })
//       window.electron.ipcRenderer.on('install-deps-error', (_event, { error }) => {
//         console.log('Error', error)
//         setInstallationStatus('error')
//         window.electron.ipcRenderer.removeAllListeners('install-deps-progress')
//         window.electron.ipcRenderer.removeAllListeners('install-deps-completed')
//         window.electron.ipcRenderer.removeAllListeners('install-deps-error')
//         reject(error)
//       })
//     })

//     await installDepsPromise
//   }
//   return (
//     <section className="flex flex-col gap-4">
//       <div className="space-y-2">
//         <Logo className="mx-auto size-12" />
//         <h1 className="text-lg font-semibold text-center">Install Dependencies</h1>
//         <p className="text-sm text-muted-foreground text-center">
//           Install the dependencies required to start using ShrinkX.
//         </p>
//       </div>
//       <div>
//         <div className="flex flex-col gap-2">
//           <div className="flex justify-between text-[12px] text-muted-foreground">
//             <p>0MB</p>
//             <p>50MB</p>
//           </div>
//           <div>
//             <div className="h-0.5 w-full rounded-full bg-secondary">
//               <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
//             </div>
//           </div>
//         </div>
//       </div>
//       <div>
//         <Button
//           size="lg"
//           disabled={installationStatus === 'installing'}
//           className="w-full"
//           onClick={handleInstall}
//         >
//           Install
//         </Button>
//       </div>
//     </section>
//   )
// }

function LicenseStep({ onNextStep }: { onNextStep: () => void }) {
  const [licenseKey, setLicenseKey] = React.useState('')
  const [isValidating, setIsValidating] = React.useState(false)
  const [validationError, setValidationError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

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
      setValidationError(error.message)
      return
    }
    if (data?.isValid) {
      window.localStorage.setItem('shrinkx-license-key', licenseKey)
      window.localStorage.setItem('shrinkx-user', JSON.stringify(data.user))
      onNextStep()
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
        <Button variant="link" className="text-muted-foreground" onClick={onNextStep}>
          skip for now
        </Button>
      </div>
    </section>
  )
}
