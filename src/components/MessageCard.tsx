'use client'
import dayjs from 'dayjs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from './ui/button'
import { SimpleTooltip } from './ui/tooltip'
import { Lightbulb, Loader2, Trash2 } from 'lucide-react'
import { Message } from '@/models/user'
import { useToast } from './ui/use-toast'
import { ApiResponse } from '@/types/APIResponse'
import type { MessageAdvice } from '@/lib/coach'
import axios, { AxiosError } from 'axios'
import { useState } from 'react'

type Props = {
  message: Message
  onMessageDelete: (messageId: string) => void
}

const MessageCard = ({ message, onMessageDelete }: Props) => {
  const { toast } = useToast()
  const [advice, setAdvice] = useState<MessageAdvice | null>(null)
  const [adviceLoading, setAdviceLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)

  const createPlan = async () => {
    if (!advice) return
    setCreating(true)
    try {
      await axios.post('/api/growth/accept', {
        title: advice.summary.slice(0, 200),
        summary: advice.summary.slice(0, 1000),
        tasks: advice.steps.slice(0, 6).map((s) => s.slice(0, 400)),
        sourceMessageIds: [message._id],
      })
      setCreated(true)
      toast({
        title: 'Added to your Coach board',
        description: 'Find it under “To Do” in the AI Coach.',
      })
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>
      toast({
        title: 'Could not create plan',
        description: axiosError?.response?.data?.message ?? 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteConfirm = async () => {
    try {
      const response = await axios.delete<ApiResponse>(`/api/delete-message/${message._id}`)
      toast({ title: response.data.message })
      onMessageDelete(message._id)
    } catch {
      toast({ title: 'Could not delete message', variant: 'destructive' })
    }
  }

  const handleCoach = async () => {
    if (advice) {
      setAdvice(null)
      return
    }
    setAdviceLoading(true)
    try {
      const res = await axios.post<ApiResponse & { advice: MessageAdvice }>('/api/coach/message', {
        messageId: message._id,
      })
      setAdvice(res.data.advice)
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>
      toast({
        title: 'Coach unavailable',
        description: axiosError?.response?.data?.message ?? 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setAdviceLoading(false)
    }
  }

  return (
    <div className="flex flex-col rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <p className="whitespace-pre-wrap break-words text-foreground">{message.content}</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <span className="text-xs text-muted-foreground">
          {dayjs(message.createdAt).format('MMM D, YYYY · h:mm A')}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground hover:text-brand dark:hover:text-brand"
            onClick={handleCoach}
            disabled={adviceLoading}
          >
            {adviceLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Lightbulb className="mr-1.5 h-4 w-4" />
                {advice ? 'Hide' : 'How to act'}
              </>
            )}
          </Button>

          <AlertDialog>
            <SimpleTooltip label="Delete message">
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
            </SimpleTooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this message?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes this message from your inbox. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {advice && (
        <div className="mt-3 rounded-md border bg-muted p-3 text-sm">
          <p className="text-foreground">{advice.summary}</p>
          {advice.actionable && advice.steps.length > 0 ? (
            <>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                {advice.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
              <Button
                size="sm"
                className="mt-3"
                onClick={createPlan}
                disabled={creating || created}
              >
                {created ? (
                  '✓ Added to Coach board'
                ) : creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Track this as a plan'
                )}
              </Button>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No concrete action needed here.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default MessageCard
