'use client'
import { useState } from 'react'
import axios, { AxiosError } from 'axios'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { useToast } from './ui/use-toast'
import type { InboxAnalysis } from '@/lib/coach'
import type { ApiResponse } from '@/types/APIResponse'

// The coach route enriches each suggested plan with the feedback it addresses.
type SuggestedPlan = InboxAnalysis['growthPlan'][number] & {
  sourceMessageIds?: string[]
  sourceCount?: number
  sourceQuote?: string
}
type Analysis = Omit<InboxAnalysis, 'growthPlan'> & { growthPlan: SuggestedPlan[] }

const SENTIMENT_SEGMENTS = [
  { key: 'positive', label: 'Positive', color: 'bg-emerald-500', meaning: 'Praise & encouragement' },
  { key: 'neutral', label: 'Neutral', color: 'bg-muted-foreground', meaning: 'Factual or mixed' },
  { key: 'negative', label: 'Negative', color: 'bg-rose-500', meaning: 'Criticism & concerns' },
] as const

const Sentiment = ({ s }: { s: InboxAnalysis['sentiment'] }) => {
  const total = Math.max(1, s.positive + s.neutral + s.negative)
  const segs = SENTIMENT_SEGMENTS.map((seg) => {
    const count = s[seg.key]
    return { ...seg, count, pct: Math.round((count / total) * 100) }
  })

  return (
    <div className="space-y-3">
      {/* Stacked bar — width is the share, and the % is shown inline when it fits. */}
      <div className="flex h-6 w-full overflow-hidden rounded-full bg-muted text-[10px] font-semibold text-white">
        {segs.map((seg) =>
          seg.count > 0 ? (
            <div
              key={seg.key}
              className={`${seg.color} flex items-center justify-center transition-all`}
              style={{ width: `${(seg.count / total) * 100}%` }}
              title={`${seg.label}: ${seg.count} of ${total} (${seg.pct}%)`}
            >
              {seg.pct >= 12 ? `${seg.pct}%` : ''}
            </div>
          ) : null
        )}
      </div>

      {/* Legend: colour → meaning, count, and percentage. */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {segs.map((seg) => (
          <div key={seg.key} className="flex items-start gap-2">
            <span className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${seg.color}`} />
            <div className="leading-tight">
              <div className="text-xs font-medium text-foreground">
                {seg.label} · {seg.count} ({seg.pct}%)
              </div>
              <div className="text-[11px] text-muted-foreground">{seg.meaning}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const InboxCoach = ({ onPlanAccepted }: { onPlanAccepted?: () => void }) => {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [accepting, setAccepting] = useState<number | null>(null)
  const [range, setRange] = useState('all')
  const [meta, setMeta] = useState<{
    analyzedCount: number
    totalInRange: number
    totalMessages: number
  } | null>(null)
  const { toast } = useToast()

  const acceptPlan = async (item: SuggestedPlan, index: number) => {
    setAccepting(index)
    try {
      await axios.post('/api/growth/accept', {
        title: item.title.slice(0, 200),
        summary: item.why.slice(0, 1000),
        tasks: [item.firstStep.slice(0, 400)],
        sourceMessageIds: item.sourceMessageIds ?? [],
      })
      toast({ title: 'Plan accepted (+5 credits)', description: 'Track it below and check in daily.' })
      onPlanAccepted?.()
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>
      toast({
        title: 'Could not accept plan',
        description: axiosError?.response?.data?.message ?? 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setAccepting(null)
    }
  }

  const runCoach = async () => {
    setLoading(true)
    try {
      const res = await axios.post<
        ApiResponse & { analysis: Analysis; meta: typeof meta }
      >('/api/coach/inbox', { range })
      setAnalysis(res.data.analysis)
      setMeta(res.data.meta)
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>
      toast({
        title: 'Coach unavailable',
        description: axiosError?.response?.data?.message ?? 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mb-6 rounded-lg border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Sparkles className="h-5 w-5 text-brand dark:text-brand" /> AI Feedback Coach
        </h2>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={runCoach} disabled={loading} size="sm">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…
              </>
            ) : analysis ? (
              'Re-analyze'
            ) : (
              'Coach my inbox'
            )}
          </Button>
        </div>
      </div>

      {meta && (
        <p className="mb-3 text-xs text-muted-foreground">
          Analyzed {meta.analyzedCount} of {meta.totalInRange} feedback
          {meta.totalInRange === 1 ? '' : 's'} in this period
          {meta.totalInRange < meta.totalMessages ? ` · ${meta.totalMessages} total` : ''}
          {meta.totalInRange > meta.analyzedCount ? ' · newest 50 used' : ''}
        </p>
      )}

      {!analysis && !loading && (
        <p className="text-sm text-muted-foreground">
          Turn your anonymous feedback into themes and a concrete growth plan.
        </p>
      )}

      {loading && !analysis && (
        <div className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-full rounded-full" />
          <div className="grid gap-2 sm:grid-cols-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {analysis && (
        <div className="space-y-5">
          <p className="text-sm text-foreground">{analysis.summary}</p>

          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sentiment
            </div>
            <Sentiment s={analysis.sentiment} />
          </div>

          {analysis.themes.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recurring themes
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.themes.map((t) => (
                  <span
                    key={t.label}
                    className="rounded-full bg-brand/10 dark:bg-brand/10 px-3 py-1 text-xs text-brand dark:text-brand"
                    title={t.examples.join(' • ')}
                  >
                    {t.label} · {t.count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analysis.growthPlan.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Suggested plans — accept to add them to your board
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {analysis.growthPlan.map((g, i) => (
                  <div key={i} className="flex flex-col rounded-md border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium text-foreground">{g.title}</div>
                      {g.sourceCount ? (
                        <span className="shrink-0 rounded-full bg-brand/10 dark:bg-brand/10 px-2 py-0.5 text-[11px] text-brand dark:text-brand">
                          {g.sourceCount} feedback{g.sourceCount === 1 ? '' : 's'}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground" title={g.why}>
                      {g.why}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-brand dark:text-brand" title={g.firstStep}>
                      <span className="font-medium">First step:</span> {g.firstStep}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 self-start"
                      onClick={() => acceptPlan(g, i)}
                      disabled={accepting === i}
                    >
                      {accepting === i ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default InboxCoach
