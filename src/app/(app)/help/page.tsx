import { MessageSquare, Sparkles, TrendingUp, Coins } from 'lucide-react'
import TourButton from '@/components/TourButton'

const STEPS = [
  {
    icon: MessageSquare,
    title: 'Share your link & receive feedback',
    body: 'Copy your public link from Profile or Feedback and share it. Anyone can send you honest, anonymous feedback — senders stay hidden from you.',
  },
  {
    icon: Sparkles,
    title: 'Let the AI Coach make sense of it',
    body: 'On the Coach page, run "Coach my inbox" to see sentiment, recurring themes, and a concrete growth plan built from your feedback.',
  },
  {
    icon: TrendingUp,
    title: 'Accept a plan & track the work',
    body: 'Accept a growth plan, check in daily with how it’s going, and watch your self-rating trend over time. Completing a plan asks your senders if they noticed a change.',
  },
  {
    icon: Coins,
    title: 'Earn & spend credits',
    body: 'Giving feedback, receiving it, checking in, and confirming change all earn credits. Redeem them for extra AI usage on the Dashboard.',
  },
]

const FAQ = [
  {
    q: 'Is my feedback really anonymous?',
    a: 'Yes. Senders are never shown to you. Logged-in senders are attributed only internally (for credits and follow-ups) and that identity is never exposed on your inbox.',
  },
  {
    q: 'Why is the inbox badge sometimes "Offline"?',
    a: 'Live updates use MongoDB change streams, which need a replica set (e.g. MongoDB Atlas). On a standalone database it falls back to manual refresh.',
  },
  {
    q: 'What happens to abusive messages?',
    a: 'Incoming messages are screened by AI moderation. Anything flagged is blocked from your inbox and sent to admins for review.',
  },
]

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-4xl p-6 md:p-8">
      <div className="mb-5 rounded-xl border bg-gradient-to-br from-brand/10 to-card p-5">
        <h1 className="text-2xl font-bold text-foreground">How Candor works</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn anonymous feedback into real, measurable growth.
        </p>
        <div className="mt-3">
          <TourButton />
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground">
                {i + 1}
              </span>
              <s.icon className="h-4 w-4 shrink-0 text-brand" />
              <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-foreground">FAQ</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {FAQ.map((f, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-foreground">{f.q}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
