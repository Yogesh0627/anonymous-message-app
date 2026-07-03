'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import dayjs from 'dayjs'
import { Skeleton } from '@/components/ui/skeleton'

type DayBucket = { date: string; count: number }
type Analytics = {
  total: number
  isAcceptingMessage: boolean
  last7Days: DayBucket[]
}

const StatTile = ({ label, value }: { label: string; value: string | number }) => (
  <div className="min-w-0 rounded-lg border bg-card p-3">
    <div className="truncate text-xl font-bold text-foreground" title={String(value)}>
      {value}
    </div>
    <div className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
  </div>
)

const BarChart = ({ data }: { data: DayBucket[] }) => {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div
      className="flex items-end gap-2 h-32"
      role="img"
      aria-label={`Messages received per day over the last 7 days. ${data
        .map((d) => `${dayjs(d.date).format('MMM D')}: ${d.count}`)
        .join(', ')}`}
    >
      {data.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-medium text-muted-foreground">{d.count}</span>
          <div
            className="w-full rounded-t bg-brand/80 transition-all"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 2 }}
            title={`${dayjs(d.date).format('MMM D')}: ${d.count} message${d.count === 1 ? '' : 's'}`}
          />
          <span className="text-[10px] text-muted-foreground">{dayjs(d.date).format('dd')}</span>
        </div>
      ))}
    </div>
  )
}

const InboxAnalytics = () => {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    axios
      .get('/api/analytics')
      .then((res) => {
        if (active) setData(res.data.analytics)
      })
      .catch(() => {
        /* analytics are non-critical; fail quietly */
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <section className="flex h-full flex-col rounded-lg border bg-muted p-5">
        <Skeleton className="mb-4 h-5 w-40" />
        <div className="mb-6 grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-auto h-16 w-full" />
      </section>
    )
  }
  if (!data) return null

  const weekTotal = data.last7Days.reduce((sum, d) => sum + d.count, 0)

  return (
    <section className="flex h-full flex-col rounded-lg border bg-muted p-5">
      <h2 className="mb-4 text-lg font-semibold text-foreground">Inbox Analytics</h2>
      <div className="mb-6 grid grid-cols-3 gap-2">
        <StatTile label="Total" value={data.total} />
        <StatTile label="7-day" value={weekTotal} />
        <StatTile label="Status" value={data.isAcceptingMessage ? 'On' : 'Off'} />
      </div>
      <div className="mt-auto">
        <BarChart data={data.last7Days} />
      </div>
    </section>
  )
}

export default InboxAnalytics
