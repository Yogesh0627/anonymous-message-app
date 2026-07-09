'use client'
import { PlayCircle } from 'lucide-react'
import { Button } from './ui/button'
import { startOnboardingTour } from './OnboardingTour'

/** Replays the first-run onboarding walkthrough. */
export default function TourButton() {
  return (
    <Button variant="outline" size="sm" onClick={startOnboardingTour}>
      <PlayCircle className="mr-1.5 h-4 w-4" /> Replay the walkthrough
    </Button>
  )
}
