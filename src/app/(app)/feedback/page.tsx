'use client'
import MessageCard from '@/components/MessageCard'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { acceptValidationSchema } from '@/inputValidations/acceptMessageSchema'
import { Message } from '@/models/user'
import { ApiResponse } from '@/types/APIResponse'
import { zodResolver } from '@hookform/resolvers/zod'
import axios, { AxiosError } from 'axios'
import { Copy, Loader2, MessageSquare, RefreshCcw } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

const FeedbackInbox = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [isSwitchLoading, setIsSwitchLoading] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 6
  const { toast } = useToast()

  const pageRef = useRef(page); pageRef.current = page
  const sortRef = useRef(sort); sortRef.current = sort

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m._id !== messageId))
    setTotal((t) => Math.max(0, t - 1))
  }

  const { data: session } = useSession()
  const form = useForm({ resolver: zodResolver(acceptValidationSchema) })
  const { register, watch, setValue } = form
  const acceptMessages = watch('acceptMessages')

  const fetchAcceptMessage = useCallback(async () => {
    setIsSwitchLoading(true)
    try {
      const response = await axios.get<ApiResponse>('/api/accept-messages')
      setValue('acceptMessages', response.data.isAcceptingMessages)
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>
      toast({
        title: 'Error',
        description: axiosError?.response?.data.message || 'Failed to fetch message settings',
        variant: 'destructive',
      })
    } finally {
      setIsSwitchLoading(false)
    }
  }, [setValue, toast])

  const fetchMessages = useCallback(
    async (refresh = false) => {
      setLoading(true)
      try {
        const response = await axios.get<ApiResponse>(
          `/api/get-messages?sort=${sort}&page=${page}&limit=${pageSize}`
        )
        setMessages(response.data.messages || [])
        setTotal(response.data.total ?? 0)
        if (refresh) {
          toast({ title: 'Refreshed', description: 'Showing latest messages' })
        }
      } catch (error) {
        const axiosError = error as AxiosError<ApiResponse>
        toast({
          title: 'Error',
          description: axiosError?.response?.data.message || 'Failed to fetch messages',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [sort, page, toast]
  )

  useEffect(() => {
    if (!session?.user) return
    fetchMessages()
    fetchAcceptMessage()
  }, [session, fetchAcceptMessage, fetchMessages])

  useEffect(() => {
    if (!session?.user) return
    const eventSource = new EventSource('/api/stream-messages')
    eventSource.addEventListener('connected', () => setIsLive(true))
    eventSource.addEventListener('message', (event) => {
      try {
        const incoming = JSON.parse(event.data) as Message
        setTotal((t) => t + 1)
        if (pageRef.current === 1 && sortRef.current === 'newest') {
          setMessages((prev) =>
            prev.some((m) => m._id === incoming._id) ? prev : [incoming, ...prev].slice(0, pageSize)
          )
        }
        toast({ title: 'New message', description: 'You just received a message.' })
      } catch {
        /* ignore malformed frame */
      }
    })
    eventSource.addEventListener('error', () => setIsLive(false))
    return () => eventSource.close()
  }, [session, toast])

  useEffect(() => {
    if (!loading && messages.length === 0 && total > 0 && page > 1) {
      setPage((p) => Math.max(1, p - 1))
    }
  }, [messages, total, loading, page])

  const handleSwitchChange = async () => {
    try {
      const response = await axios.post<ApiResponse>('/api/accept-messages', {
        acceptingMessages: !acceptMessages,
      })
      setValue('acceptMessages', !acceptMessages)
      toast({ title: response.data.message })
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>
      toast({
        title: 'Error',
        description: axiosError?.response?.data.message || 'Failed to update setting',
        variant: 'destructive',
      })
    }
  }

  const username = session?.user.username
  const baseUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : ''
  const profileUrl = username ? `${baseUrl}/user/${username}` : ''
  const copyToClipboard = () => {
    navigator.clipboard.writeText(profileUrl)
    toast({ title: 'URL copied', description: 'Your profile link is on the clipboard.' })
  }

  if (!session?.user) return null

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="mx-auto w-full max-w-5xl p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-foreground">Feedback Inbox</h1>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            isLive ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300' : 'bg-muted text-muted-foreground'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
          {isLive ? 'Live' : 'Offline'}
        </span>
      </div>

      <div className="mb-6 rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Your public link</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={profileUrl}
            disabled
            className="w-full rounded-md border bg-muted p-2 text-sm text-muted-foreground"
          />
          <Button onClick={copyToClipboard} size="sm" className="shrink-0">
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Switch
            {...register('acceptMessages')}
            checked={acceptMessages}
            onCheckedChange={handleSwitchChange}
            disabled={isSwitchLoading}
          />
          <span className="text-sm text-muted-foreground">
            Accept messages: {acceptMessages ? 'On' : 'Off'}
          </span>
        </div>
      </div>

      <Separator />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => fetchMessages(true)}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
        </Button>
        <span className="text-sm text-muted-foreground">Sort:</span>
        <Select
          value={sort}
          onValueChange={(v) => {
            setSort(v as 'newest' | 'oldest')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          {total} message{total === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
        {loading && messages.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-6">
              <Skeleton className="mb-3 h-5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))
        ) : messages.length > 0 ? (
          messages.map((message) => (
            <MessageCard key={message._id} message={message} onMessageDelete={handleDeleteMessage} />
          ))
        ) : (
          <div className="rounded-lg border border-dashed bg-card py-12 text-center md:col-span-2">
            <MessageSquare className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Share your link above to start receiving anonymous feedback.
            </p>
          </div>
        )}
      </div>

      {total > pageSize && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

export default FeedbackInbox
