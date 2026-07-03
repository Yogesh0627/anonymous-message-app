'use client'
import { useCallback, useEffect, useState } from 'react'
import axios, { AxiosError } from 'axios'
import dayjs from 'dayjs'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Skeleton } from './ui/skeleton'
import { useToast } from './ui/use-toast'
import type { ApiResponse } from '@/types/APIResponse'

type Task = { id: string; title: string; done: boolean }
type CheckIn = { date: string; note: string; mood: number }
type Plan = {
  _id: string
  title: string
  summary: string
  tasks: Task[]
  status: 'active' | 'completed' | 'archived'
  checkIns: CheckIn[]
  sources: string[]
}

type Bucket = 'pending' | 'in_progress' | 'completed'

const bucketOf = (p: Plan): Bucket => {
  if (p.status === 'completed') return 'completed'
  return p.tasks.some((t) => t.done) ? 'in_progress' : 'pending'
}

const TABS: { key: Bucket; label: string; accent: string }[] = [
  { key: 'pending', label: 'To Do', accent: 'text-foreground border-muted-foreground' },
  { key: 'in_progress', label: 'In Progress', accent: 'text-brand dark:text-brand border-brand' },
  { key: 'completed', label: 'Completed', accent: 'text-green-700 dark:text-green-300 border-green-500' },
]

const MoodChart = ({ checkIns }: { checkIns: CheckIn[] }) => {
  if (checkIns.length === 0) {
    return <p className="text-xs text-muted-foreground">Check in daily to chart how you feel.</p>
  }
  const w = 240
  const h = 44
  const step = checkIns.length > 1 ? w / (checkIns.length - 1) : 0
  const points = checkIns.map((c, i) => `${i * step},${h - ((c.mood - 1) / 4) * h}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-11 w-full" role="img" aria-label="Self-rating trend">
      <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" />
      {checkIns.map((c, i) => (
        <circle key={i} cx={i * step} cy={h - ((c.mood - 1) / 4) * h} r="2.5" fill="#6366f1" />
      ))}
    </svg>
  )
}

const PlanCard = ({ plan, onChanged }: { plan: Plan; onChanged: () => void }) => {
  const { toast } = useToast()
  const [note, setNote] = useState('')
  const [mood, setMood] = useState(3)
  const [busy, setBusy] = useState(false)

  const done = plan.tasks.filter((t) => t.done).length
  const pct = Math.round((done / Math.max(1, plan.tasks.length)) * 100)
  const isCompleted = plan.status === 'completed'
  const checkedInToday = plan.checkIns.some((c) => c.date === dayjs().format('YYYY-MM-DD'))

  const toggleTask = async (taskId: string, value: boolean) => {
    try {
      await axios.post('/api/growth/task', { planId: plan._id, taskId, done: value })
      onChanged()
    } catch {
      toast({ title: 'Could not update task', variant: 'destructive' })
    }
  }

  const submitCheckIn = async () => {
    setBusy(true)
    try {
      const res = await axios.post<ApiResponse>('/api/growth/checkin', {
        planId: plan._id,
        note,
        mood,
      })
      toast({ title: res.data.message })
      setNote('')
      onChanged()
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>
      toast({
        title: 'Check-in failed',
        description: axiosError?.response?.data?.message ?? 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col rounded-lg border bg-card p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-foreground">{plan.title}</h3>
        <span className="shrink-0 text-xs text-muted-foreground">
          {done}/{plan.tasks.length}
        </span>
      </div>

      {plan.sources.length > 0 && (
        <blockquote className="mb-3 border-l-2 border-brand/30 bg-brand/10 py-1.5 pl-3 pr-2 text-xs italic text-muted-foreground">
          <span className="mr-1 not-italic font-medium text-brand">
            {plan.sources.length > 1 ? `From ${plan.sources.length} feedbacks:` : 'From feedback:'}
          </span>
          &ldquo;{plan.sources[0]}&rdquo;
        </blockquote>
      )}

      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ul className="mb-3 space-y-1.5">
        {plan.tasks.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => toggleTask(t.id, !t.done)}
              className="flex items-start gap-2 text-left text-sm"
            >
              {t.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className={t.done ? 'text-muted-foreground line-through' : 'text-foreground'}>{t.title}</span>
            </button>
          </li>
        ))}
      </ul>

      {plan.checkIns.length > 0 && (
        <div className="mb-3">
          <MoodChart checkIns={plan.checkIns} />
        </div>
      )}

      {!isCompleted &&
        (checkedInToday ? (
          <p className="mt-auto text-xs font-medium text-green-600 dark:text-green-400">✓ Checked in today</p>
        ) : (
          <div className="mt-auto space-y-2 rounded-md bg-muted p-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Feeling:</span>
              {[1, 2, 3, 4, 5].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`h-6 w-6 rounded-full text-xs ${
                    mood === m ? 'bg-brand text-brand-foreground' : 'border bg-card text-muted-foreground'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you try today?"
              className="min-h-14 resize-none text-sm"
            />
            <Button size="sm" onClick={submitCheckIn} disabled={busy || note.trim().length < 5}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check in (+10)'}
            </Button>
          </div>
        ))}
    </div>
  )
}

const GrowthBoard = ({ refreshKey = 0 }: { refreshKey?: number }) => {
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [tab, setTab] = useState<Bucket>('in_progress')

  const load = useCallback(async () => {
    try {
      const res = await axios.get<ApiResponse & { plans: Plan[] }>('/api/growth/plans')
      setPlans(res.data.plans ?? [])
    } catch {
      setPlans([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  if (plans === null) {
    return (
      <section className="rounded-lg border bg-muted p-5">
        <Skeleton className="mb-4 h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </section>
    )
  }

  const counts: Record<Bucket, number> = { pending: 0, in_progress: 0, completed: 0 }
  plans.forEach((p) => (counts[bucketOf(p)] += 1))
  const visible = plans.filter((p) => bucketOf(p) === tab)

  return (
    <section className="rounded-lg border bg-muted p-5">
      <h2 className="mb-4 text-lg font-semibold text-foreground">Your Growth Board</h2>

      <div className="mb-5 flex gap-2 rounded-lg bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {t.label}
            <span className={`ml-1.5 ${tab === t.key ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No plans yet — run the coach above and accept a plan to start your board.
        </p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing in {TABS.find((t) => t.key === tab)?.label}.</p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          {visible.map((plan) => (
            <PlanCard key={plan._id} plan={plan} onChanged={load} />
          ))}
        </div>
      )}
    </section>
  )
}

export default GrowthBoard
