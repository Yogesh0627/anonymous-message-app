'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { Skeleton } from '@/components/ui/skeleton'

type Item = {
  _id: string
  title: string
  description: string
  status: 'planned' | 'in_progress' | 'shipped'
  targetVersion: string
}

const COLUMNS: { status: Item['status']; label: string; accent: string; dot: string }[] = [
  { status: 'planned', label: 'Planned', accent: 'border-t-muted-foreground', dot: 'bg-muted-foreground' },
  { status: 'in_progress', label: 'In Progress', accent: 'border-t-brand', dot: 'bg-brand' },
  { status: 'shipped', label: 'Shipped', accent: 'border-t-green-500', dot: 'bg-green-500' },
]

const ColumnSkeleton = () => (
  <div>
    <Skeleton className="mb-3 h-4 w-24" />
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-t-4 border-t-muted bg-card p-4">
          <Skeleton className="mb-2 h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  </div>
)

export default function RoadmapPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios
      .get('/api/roadmap')
      .then((res) => setItems(res.data.roadmap ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto w-full max-w-5xl p-6 md:p-8">
      <h1 className="mb-1 text-3xl font-bold text-foreground">Product Roadmap</h1>
      <p className="mb-8 text-muted-foreground">What we&apos;re building next for Candor.</p>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {COLUMNS.map((c) => (
            <ColumnSkeleton key={c.status} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">No roadmap items yet — check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const colItems = items.filter((i) => i.status === col.status)
            return (
              <div key={col.status}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                  {col.label}
                  <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground">
                    {colItems.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {colItems.map((item) => (
                    <div key={item._id} className={`rounded-lg border border-t-4 bg-card p-4 ${col.accent}`}>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-foreground">{item.title}</h3>
                        {item.targetVersion && (
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {item.targetVersion}
                          </span>
                        )}
                      </div>
                      {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
                    </div>
                  ))}
                  {colItems.length === 0 && <p className="text-xs text-muted-foreground">Nothing here yet.</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
