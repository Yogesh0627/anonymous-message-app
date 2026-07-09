'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import axios from 'axios'
import { Copy, Coins, MessageSquare, Target, ShieldCheck, Pencil, Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import type { ApiResponse } from '@/types/APIResponse'

type Stats = { credits: number; feedback: number; plans: number }

const StatTile = ({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Coins
  label: string
  value: number | null
  tint: string
}) => (
  <div className="rounded-lg border bg-card p-4">
    <div className={`mb-1 inline-flex rounded-md p-1.5 ${tint}`}>
      <Icon className="h-4 w-4" />
    </div>
    {value === null ? (
      <Skeleton className="h-7 w-10" />
    ) : (
      <div className="text-2xl font-bold text-foreground">{value}</div>
    )}
    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
  </div>
)

const ProfilePage = () => {
  const { data: session, update } = useSession()
  const { toast } = useToast()
  const [stats, setStats] = useState<Stats | null>(null)

  // Username editing.
  const currentUsername = (session?.user as { username?: string })?.username ?? ''
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [avail, setAvail] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle')
  const [saving, setSaving] = useState(false)
  const [renameInfo, setRenameInfo] = useState<{
    changesRemaining: number | null
    maxChanges: number
    nextChangeAt: string | null
  } | null>(null)

  // How many username changes are left in the rolling year.
  useEffect(() => {
    axios
      .get<ApiResponse & { changesRemaining: number | null; maxChanges: number; nextChangeAt: string | null }>(
        '/api/profile'
      )
      .then((r) =>
        setRenameInfo({
          changesRemaining: r.data.changesRemaining,
          maxChanges: r.data.maxChanges,
          nextChangeAt: r.data.nextChangeAt,
        })
      )
      .catch(() => {})
  }, [])

  // Live availability check (debounced) — reuses the sign-up uniqueness route.
  useEffect(() => {
    if (!editing) return
    const v = value.trim()
    if (v === currentUsername) return setAvail('idle')
    if (!/^[a-zA-Z0-9_]{3,15}$/.test(v)) return setAvail(v ? 'invalid' : 'idle')
    setAvail('checking')
    const t = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/check-username-unique?username=${encodeURIComponent(v)}`)
        setAvail(res.data?.success ? 'ok' : 'taken')
      } catch {
        setAvail('taken')
      }
    }, 400)
    return () => clearTimeout(t)
  }, [value, editing, currentUsername])

  const startEdit = () => {
    setValue(currentUsername)
    setAvail('idle')
    setEditing(true)
  }

  const saveUsername = async () => {
    const v = value.trim()
    if (!/^[a-zA-Z0-9_]{3,15}$/.test(v)) {
      toast({ title: 'Invalid username', description: '3–15 letters, numbers or underscore.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await axios.patch<ApiResponse & { username: string; changesRemaining: number | null }>(
        '/api/profile',
        { username: v }
      )
      await update({ username: res.data.username ?? v })
      toast({ title: 'Username updated', description: `You're now @${res.data.username ?? v}.` })
      setRenameInfo((prev) =>
        prev ? { ...prev, changesRemaining: res.data.changesRemaining ?? prev.changesRemaining } : prev
      )
      setEditing(false)
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ title: 'Update failed', description: message ?? 'Please try again.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    let active = true
    Promise.all([
      axios.get<ApiResponse & { balance: number }>('/api/credits'),
      axios.get<ApiResponse & { analytics?: { total: number } }>('/api/analytics'),
      axios.get<ApiResponse & { plans?: unknown[] }>('/api/growth/plans'),
    ])
      .then(([c, a, p]) => {
        if (!active) return
        setStats({
          credits: c.data.balance ?? 0,
          feedback: a.data.analytics?.total ?? 0,
          plans: (p.data.plans ?? []).length,
        })
      })
      .catch(() => active && setStats({ credits: 0, feedback: 0, plans: 0 }))
    return () => {
      active = false
    }
  }, [])

  if (!session?.user) return null

  const user = session.user as { username?: string; email?: string | null; role?: string }
  const username = user.username || 'user'
  const limitReached = renameInfo?.changesRemaining === 0
  const baseUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : ''
  const profileUrl = `${baseUrl}/user/${username}`

  const copy = () => {
    navigator.clipboard.writeText(profileUrl)
    toast({ title: 'URL copied', description: 'Your profile link is on the clipboard.' })
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-6 md:p-8">
      <h1 className="mb-6 text-3xl font-bold text-foreground">Profile</h1>

      <div className="mb-6 flex items-center gap-4 rounded-xl border bg-gradient-to-br from-brand/10 to-card p-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-3xl font-bold text-brand-foreground">
          {username.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div>
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && avail !== 'taken' && avail !== 'invalid') saveUsername()
                    if (e.key === 'Escape') setEditing(false)
                  }}
                  maxLength={15}
                  className="w-full min-w-0 rounded-md border bg-background px-2 py-1 text-lg font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="username"
                />
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={saveUsername}
                  disabled={saving || avail === 'taken' || avail === 'invalid' || avail === 'checking'}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => setEditing(false)} disabled={saving}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 h-4 text-xs">
                {avail === 'checking' && <span className="text-muted-foreground">Checking…</span>}
                {avail === 'ok' && <span className="text-green-600 dark:text-green-400">✓ Available</span>}
                {avail === 'taken' && <span className="text-rose-600 dark:text-rose-400">Already taken</span>}
                {avail === 'invalid' && <span className="text-rose-600 dark:text-rose-400">3–15 letters, numbers or _</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                Your old links keep working — renaming never loses feedback, and your old name stays reserved.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                <span className="truncate">{username}</span>
                <button
                  onClick={startEdit}
                  disabled={limitReached}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  aria-label="Edit username"
                  title={limitReached ? 'Yearly name-change limit reached' : 'Edit username'}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {user.role === 'admin' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                    <ShieldCheck className="h-3 w-3" /> Admin
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
              {renameInfo && renameInfo.changesRemaining !== null && (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {renameInfo.changesRemaining > 0
                    ? `${renameInfo.changesRemaining} of ${renameInfo.maxChanges} name changes left this year`
                    : `Name-change limit reached${
                        renameInfo.nextChangeAt
                          ? ` · available again ${new Date(renameInfo.nextChangeAt).toLocaleDateString()}`
                          : ''
                      }`}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatTile icon={Coins} label="Credits" value={stats?.credits ?? null} tint="bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400" />
        <StatTile icon={MessageSquare} label="Feedback" value={stats?.feedback ?? null} tint="bg-brand/15 text-brand" />
        <StatTile icon={Target} label="Growth plans" value={stats?.plans ?? null} tint="bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400" />
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Your public feedback link</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={profileUrl}
            disabled
            className="w-full rounded-md border bg-muted p-2 text-sm text-muted-foreground"
          />
          <Button size="sm" onClick={copy}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Share this so anyone can send you anonymous feedback.</p>
      </div>
    </div>
  )
}

export default ProfilePage
