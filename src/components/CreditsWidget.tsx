'use client'
import { useCallback, useEffect, useState } from 'react'
import axios, { AxiosError } from 'axios'
import { Coins, Loader2, Zap } from 'lucide-react'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import { SimpleTooltip } from './ui/tooltip'
import { useToast } from './ui/use-toast'
import type { ApiResponse } from '@/types/APIResponse'

type Entry = { delta: number; reason: string; createdAt: string }

const REASON_LABELS: Record<string, string> = {
  give_feedback: 'Gave feedback',
  receive_feedback: 'Received feedback',
  accept_plan: 'Accepted a plan',
  daily_checkin: 'Daily check-in',
  confirm_change_receiver: 'Change confirmed',
  confirm_change_sender: 'Confirmed a change',
  redeem_ai: 'Redeemed AI calls',
}

const BUNDLES = [
  { id: 'ai_calls_10', label: '10 AI calls', cost: 50 },
  { id: 'ai_calls_25', label: '25 AI calls', cost: 100 },
]

const CreditsWidget = ({ refreshKey }: { refreshKey: number }) => {
  const [balance, setBalance] = useState<number | null>(null)
  const [recent, setRecent] = useState<Entry[]>([])
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [quota, setQuota] = useState<{ used: number; limit: number; remaining: number } | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      const res = await axios.get<ApiResponse & { balance: number; recent: Entry[] }>('/api/credits')
      setBalance(res.data.balance)
      setRecent(res.data.recent ?? [])
    } catch {
      /* non-critical */
    }
    try {
      const res = await axios.get<ApiResponse & { quota: typeof quota }>('/api/quota')
      setQuota(res.data.quota)
    } catch {
      /* non-critical */
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const redeem = async (bundle: string) => {
    setRedeeming(bundle)
    try {
      const res = await axios.post<ApiResponse & { balance: number }>('/api/credits/redeem', { bundle })
      toast({ title: res.data.message })
      setBalance(res.data.balance)
      load()
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>
      toast({
        title: 'Redeem failed',
        description: axiosError?.response?.data?.message ?? 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setRedeeming(null)
    }
  }

  return (
    <section className="rounded-lg border bg-gradient-to-br from-brand/10 to-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Coins className="h-6 w-6 text-amber-500" />
          <div>
            <div className="text-2xl font-bold text-foreground">
              {balance === null ? (
                <Skeleton className="inline-block h-6 w-10 align-middle" />
              ) : (
                balance
              )}{' '}
              <span className="text-sm font-normal text-muted-foreground">credits</span>
            </div>
            <div className="text-xs text-muted-foreground">Earn by giving & acting on feedback</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {BUNDLES.map((b) => (
            <SimpleTooltip key={b.id} label={`Spend ${b.cost} credits`}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => redeem(b.id)}
                disabled={redeeming !== null || (balance ?? 0) < b.cost}
              >
                {redeeming === b.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>{b.label} · {b.cost}</>
                )}
              </Button>
            </SimpleTooltip>
          ))}
        </div>
      </div>

      {quota && (
        <div className="mt-4 border-t pt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-medium text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> AI calls today
            </span>
            <span className="text-muted-foreground">
              {quota.used} / {quota.limit} used
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${Math.min(100, (quota.used / Math.max(1, quota.limit)) * 100)}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {quota.remaining} remaining · redeem credits above for more
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <ul className="mt-4 space-y-1 border-t pt-3">
          {recent.slice(0, 5).map((e, i) => (
            <li key={i} className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{REASON_LABELS[e.reason] ?? e.reason}</span>
              <span className={e.delta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}>
                {e.delta >= 0 ? '+' : ''}
                {e.delta}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default CreditsWidget
