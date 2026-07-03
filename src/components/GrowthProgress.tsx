'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { CheckCircle2, Clock, ListTodo } from 'lucide-react'
import { Skeleton } from './ui/skeleton'
import type { ApiResponse } from '@/types/APIResponse'

type Task = { id: string; done: boolean }
type Plan = {
  _id: string
  title: string
  status: 'active' | 'completed' | 'archived'
  tasks: Task[]
}

const StatTile = ({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Clock
  label: string
  value: number
  tint: string
}) => (
  <div className="rounded-lg border bg-card p-4">
    <div className={`mb-1 inline-flex rounded-md p-1.5 ${tint}`}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="text-2xl font-bold text-foreground">{value}</div>
    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
  </div>
)

const GrowthProgress = ({ refreshKey = 0 }: { refreshKey?: number }) => {
  const [plans, setPlans] = useState<Plan[] | null>(null)

  useEffect(() => {
    let active = true
    axios
      .get<ApiResponse & { plans: Plan[] }>('/api/growth/plans')
      .then((res) => active && setPlans(res.data.plans ?? []))
      .catch(() => active && setPlans([]))
    return () => {
      active = false
    }
  }, [refreshKey])

  if (plans === null) {
    return (
      <section className="flex h-full flex-col rounded-lg border bg-muted p-5">
        <Skeleton className="mb-4 h-5 w-40" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </section>
    )
  }

  const activePlans = plans.filter((p) => p.status === 'active')
  const completed = plans.filter((p) => p.status === 'completed').length
  const pendingTasks = activePlans.reduce(
    (n, p) => n + p.tasks.filter((t) => !t.done).length,
    0
  )

  if (plans.length === 0) {
    return (
      <section className="flex h-full flex-col rounded-lg border bg-muted p-5">
        <h2 className="mb-1 text-lg font-semibold text-foreground">Growth Progress</h2>
        <p className="text-sm text-muted-foreground">
          No growth plans yet.{' '}
          <Link href="/coach" className="font-medium text-brand dark:text-brand hover:underline">
            Run the AI Coach
          </Link>{' '}
          to turn your feedback into a plan.
        </p>
      </section>
    )
  }

  return (
    <section className="flex h-full flex-col rounded-lg border bg-muted p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Growth Progress</h2>
        <Link href="/coach" className="text-sm font-medium text-brand dark:text-brand hover:underline">
          View all
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatTile icon={Clock} label="In progress" value={activePlans.length} tint="bg-brand/15 dark:bg-brand/20 text-brand dark:text-brand" />
        <StatTile icon={CheckCircle2} label="Completed" value={completed} tint="bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300" />
        <StatTile icon={ListTodo} label="Pending tasks" value={pendingTasks} tint="bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300" />
      </div>

      {activePlans.length > 0 && (
        <ul className="space-y-3">
          {activePlans.slice(0, 3).map((plan) => {
            const done = plan.tasks.filter((t) => t.done).length
            const total = Math.max(1, plan.tasks.length)
            const pct = Math.round((done / total) * 100)
            return (
              <li key={plan._id} className="rounded-md border bg-card p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{plan.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {done}/{plan.tasks.length} tasks
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default GrowthProgress
