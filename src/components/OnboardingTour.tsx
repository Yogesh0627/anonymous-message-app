'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Sparkles,
  Share2,
  MessageSquare,
  Target,
  Coins,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Button } from './ui/button'
import { useEscapeKey, useFocusTrap, useScrollLock } from '@/hooks/useModalA11y'

const KEY = 'candor:onboarded'

type Step = { icon: LucideIcon; title: string; body: string }

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: 'Welcome to Candor 👋',
    body: 'Candor turns anonymous feedback into a growth plan you can actually act on. Here’s a 30-second tour of how it works.',
  },
  {
    icon: Share2,
    title: 'Share your link',
    body: 'You have a personal link — /user/your-name — on your Dashboard and Profile. Share it anywhere so people can send you honest, anonymous feedback.',
  },
  {
    icon: MessageSquare,
    title: 'Feedback arrives live',
    body: 'New messages land in your Feedback inbox in real time — no refresh needed. Abusive content is filtered out automatically.',
  },
  {
    icon: Target,
    title: 'Coach your inbox',
    body: 'Open the AI Coach to cluster your feedback into themes and turn it into a growth plan you can track from To-Do to Completed.',
  },
  {
    icon: Coins,
    title: 'Earn & spend credits',
    body: 'You earn credits for giving feedback and acting on your own. Spend them on AI calls — everything is tracked on your Dashboard.',
  },
]

/** Fire this from anywhere (e.g. the Help page) to replay the walkthrough. */
export function startOnboardingTour() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('candor:tour'))
}

export default function OnboardingTour() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    if (!localStorage.getItem(KEY)) {
      // Give the app shell a beat to render before the tour appears.
      timer = setTimeout(() => setOpen(true), 700)
    }
    const replay = () => {
      setStep(0)
      setOpen(true)
    }
    window.addEventListener('candor:tour', replay)
    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('candor:tour', replay)
    }
  }, [])

  const finish = useCallback(() => {
    localStorage.setItem(KEY, '1')
    setOpen(false)
  }, [])

  // Escape closes, Tab stays inside the panel, the page behind can't scroll.
  // Hooks run unconditionally — they no-op while `open` is false.
  useEscapeKey(open, finish)
  useFocusTrap(dialogRef, open)
  useScrollLock(open)

  if (!open) return null

  const isLast = step === STEPS.length - 1
  const { icon: Icon, title, body } = STEPS[step]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Product walkthrough"
    >
      <div ref={dialogRef} className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Icon className="h-6 w-6" />
          </div>
          <button
            onClick={finish}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>

        {/* Progress dots */}
        <div className="mt-5 flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-5 bg-brand' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div>
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isLast && (
              <Button variant="ghost" size="sm" onClick={finish} className="text-muted-foreground">
                Skip
              </Button>
            )}
            <Button size="sm" onClick={() => (isLast ? finish() : setStep((s) => s + 1))}>
              {isLast ? (
                <>
                  Get started <Check className="ml-1 h-4 w-4" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
