'use client'
import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from './ui/button'
import { useToast } from './ui/use-toast'
import type { ApiResponse } from '@/types/APIResponse'

type Request = { _id: string; receiverUsername: string; requestedAt: string }

const FeedbackGiven = () => {
  const [requests, setRequests] = useState<Request[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      const res = await axios.get<ApiResponse & { requests: Request[] }>('/api/feedback-given')
      setRequests(res.data.requests ?? [])
    } catch {
      /* non-critical */
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const respond = async (id: string, decision: 'confirmed' | 'declined') => {
    setBusyId(id)
    try {
      const res = await axios.post<ApiResponse>(`/api/confirmations/${id}`, { decision })
      toast({ title: res.data.message })
      setRequests((prev) => prev.filter((r) => r._id !== id))
    } catch {
      toast({ title: 'Could not submit response', variant: 'destructive' })
    } finally {
      setBusyId(null)
    }
  }

  if (requests.length === 0) return null

  return (
    <section className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-5">
      <h2 className="mb-1 text-lg font-semibold text-foreground">Feedback you gave</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Someone acted on feedback you sent. Do you notice a change?
      </p>
      <ul className="space-y-3">
        {requests.map((r) => (
          <li
            key={r._id}
            className="flex flex-col gap-2 rounded-md border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm text-foreground">
              You gave feedback to <span className="font-medium">@{r.receiverUsername}</span> — noticed a change?
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => respond(r._id, 'confirmed')}
                disabled={busyId === r._id}
              >
                Yes (+10)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => respond(r._id, 'declined')}
                disabled={busyId === r._id}
              >
                Not yet
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default FeedbackGiven
