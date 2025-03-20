import * as React from 'react'
import { ReactCompareSlider } from 'react-compare-slider'

import Logo from '@renderer/components/logo'
import { Dialog, DialogContent, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import InstallModalContent from './install-modal-content'
import LicenseModalContent from './license-modal-content'

export default function OnBoardingModal() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0)

  function handleNextStep() {
    const nextStepIndex = currentStepIndex + 1
    const hasNextStep = nextStepIndex < steps.length
    if (hasNextStep) {
      setCurrentStepIndex(nextStepIndex)
    } else {
      setIsOpen(false)
    }
  }

  const steps = [
    {
      id: 'welcome',
      component: <WelcomeStep onNextStep={handleNextStep} />
    },
    {
      id: 'install',
      component: <InstallModalContent onInstallCompleted={handleNextStep} />
    },
    {
      id: 'license',
      component: <LicenseModalContent onValidated={handleNextStep} onSkip={handleNextStep} />
    }
  ]

  React.useEffect(() => {
    async function effect() {
      const { isInstalled } = await window.api.checkDependencies()

      if (!isInstalled) {
        setIsOpen(true)
      }
    }
    effect()
  }, [])

  const currentStep = steps[currentStepIndex]

  return (
    <Dialog open={isOpen}>
      <DialogContent hasCloseButton={false} className="max-w-xl">
        <DialogTitle className="sr-only">Onboarding</DialogTitle>
        {currentStep.component}
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
