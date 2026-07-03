'use client'
import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

type Stats = {
  totalUsers: number
  verified: number
  banned: number
  admins: number
  totalMessages: number
  totalCredits: number
  pendingFlags: number
  growthPlans: number
}
type AdminUserRow = {
  _id: string
  username: string
  email: string
  isVerified: boolean
  isBanned: boolean
  role: 'user' | 'admin'
  credits: number
  messageCount: number
}
type Flagged = {
  _id: string
  recipientUsername: string
  hasSender: boolean
  content: string
  category: string
  reason: string
  createdAt: string
}
type Settings = { registrationOpen: boolean; aiEnabled: boolean; maintenanceMode: boolean }
type Audit = {
  _id: string
  adminUsername: string
  action: string
  targetType: string
  targetId: string
  createdAt: string
}

type RoadmapItem = {
  _id: string
  title: string
  description: string
  status: 'planned' | 'in_progress' | 'shipped'
  targetVersion: string
  isPublic: boolean
}

const TABS = ['Overview', 'Users', 'Moderation', 'Roadmap', 'Settings', 'Audit'] as const
type Tab = (typeof TABS)[number]

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border bg-card p-4">
    <div className="text-2xl font-bold text-foreground">{value}</div>
    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
  </div>
)

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('Overview')
  const { toast } = useToast()

  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [query, setQuery] = useState('')
  const [flagged, setFlagged] = useState<Flagged[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [audit, setAudit] = useState<Audit[]>([])
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([])
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    targetVersion: '',
    status: 'planned' as RoadmapItem['status'],
  })

  const loadStats = useCallback(async () => {
    const res = await axios.get('/api/admin/stats')
    setStats(res.data.stats)
  }, [])
  const loadUsers = useCallback(async (q = '') => {
    const res = await axios.get(`/api/admin/users?q=${encodeURIComponent(q)}`)
    setUsers(res.data.users ?? [])
  }, [])
  const loadFlagged = useCallback(async () => {
    const res = await axios.get('/api/admin/moderation')
    setFlagged(res.data.flagged ?? [])
  }, [])
  const loadSettings = useCallback(async () => {
    const res = await axios.get('/api/admin/settings')
    setSettings(res.data.settings)
  }, [])
  const loadAudit = useCallback(async () => {
    const res = await axios.get('/api/admin/audit')
    setAudit(res.data.entries ?? [])
  }, [])
  const loadRoadmap = useCallback(async () => {
    const res = await axios.get('/api/admin/roadmap')
    setRoadmap(res.data.items ?? [])
  }, [])

  useEffect(() => {
    loadStats().catch(() => {})
  }, [loadStats])

  useEffect(() => {
    if (tab === 'Users') loadUsers(query).catch(() => {})
    if (tab === 'Moderation') loadFlagged().catch(() => {})
    if (tab === 'Settings') loadSettings().catch(() => {})
    if (tab === 'Audit') loadAudit().catch(() => {})
    if (tab === 'Roadmap') loadRoadmap().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const createRoadmap = async () => {
    if (!newItem.title.trim()) return
    try {
      await axios.post('/api/admin/roadmap', newItem)
      setNewItem({ title: '', description: '', targetVersion: '', status: 'planned' })
      loadRoadmap()
      toast({ title: 'Roadmap item added' })
    } catch {
      toast({ title: 'Could not add item', variant: 'destructive' })
    }
  }

  const patchRoadmap = async (id: string, patch: Partial<RoadmapItem>) => {
    try {
      await axios.patch(`/api/admin/roadmap/${id}`, patch)
      loadRoadmap()
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' })
    }
  }

  const deleteRoadmap = async (id: string) => {
    try {
      await axios.delete(`/api/admin/roadmap/${id}`)
      loadRoadmap()
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  const userAction = async (id: string, action: string, extra: Record<string, unknown> = {}) => {
    try {
      const res = await axios.post(`/api/admin/users/${id}`, { action, ...extra })
      toast({ title: res.data.message })
      loadUsers(query)
      loadStats()
    } catch (error: any) {
      toast({
        title: 'Action failed',
        description: error?.response?.data?.message ?? 'Try again',
        variant: 'destructive',
      })
    }
  }

  const reviewFlag = async (id: string, decision: 'upheld' | 'dismissed') => {
    try {
      const res = await axios.post(`/api/admin/moderation/${id}`, { decision })
      toast({ title: res.data.message })
      loadFlagged()
      loadStats()
    } catch {
      toast({ title: 'Review failed', variant: 'destructive' })
    }
  }

  const updateSetting = async (patch: Partial<Settings>) => {
    try {
      const res = await axios.put('/api/admin/settings', patch)
      setSettings(res.data.settings)
      toast({ title: 'Settings updated' })
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' })
    }
  }

  return (
    <div className="mx-auto my-8 w-full max-w-6xl px-4">
      <h1 className="mb-4 text-3xl font-bold">Admin Console</h1>

      <div className="mb-6 flex flex-wrap gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm ${
              tab === t ? 'border-b-2 border-brand font-medium text-brand' : 'text-muted-foreground'
            }`}
          >
            {t}
            {t === 'Moderation' && stats?.pendingFlags ? (
              <span className="ml-1 rounded-full bg-rose-500 px-1.5 text-xs text-white">
                {stats.pendingFlags}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'Overview' && stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Users" value={stats.totalUsers} />
          <StatCard label="Verified" value={stats.verified} />
          <StatCard label="Banned" value={stats.banned} />
          <StatCard label="Admins" value={stats.admins} />
          <StatCard label="Messages" value={stats.totalMessages} />
          <StatCard label="Credits in circulation" value={stats.totalCredits} />
          <StatCard label="Pending flags" value={stats.pendingFlags} />
          <StatCard label="Growth plans" value={stats.growthPlans} />
        </div>
      )}

      {tab === 'Users' && (
        <div>
          <div className="mb-3 flex gap-2">
            <Input
              placeholder="Search username or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUsers(query)}
            />
            <Button onClick={() => loadUsers(query)}>Search</Button>
          </div>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">User</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Msgs</th>
                  <th className="p-2">Credits</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-t">
                    <td className="p-2">
                      <div className="font-medium">{u.username}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="p-2">{u.role}</td>
                    <td className="p-2">{u.messageCount}</td>
                    <td className="p-2">{u.credits}</td>
                    <td className="p-2">
                      {u.isBanned ? (
                        <span className="text-rose-600 dark:text-rose-400">banned</span>
                      ) : u.isVerified ? (
                        <span className="text-green-600 dark:text-green-400">active</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">unverified</span>
                      )}
                    </td>
                    <td className="space-x-1 p-2 whitespace-nowrap">
                      {u.isBanned ? (
                        <Button size="sm" variant="outline" onClick={() => userAction(u._id, 'unban')}>
                          Unban
                        </Button>
                      ) : (
                        <Button size="sm" variant="destructive" onClick={() => userAction(u._id, 'ban')}>
                          Ban
                        </Button>
                      )}
                      {!u.isVerified && (
                        <Button size="sm" variant="outline" onClick={() => userAction(u._id, 'verify')}>
                          Verify
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          userAction(u._id, 'setRole', { role: u.role === 'admin' ? 'user' : 'admin' })
                        }
                      >
                        {u.role === 'admin' ? 'Demote' : 'Make admin'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => userAction(u._id, 'adjustCredits', { amount: 50 })}>
                        +50
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Moderation' && (
        <div className="space-y-3">
          {flagged.length === 0 && <p className="text-sm text-muted-foreground">No pending flagged messages.</p>}
          {flagged.map((f) => (
            <div key={f._id} className="rounded-lg border bg-card p-4">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-rose-100 dark:bg-rose-500/15 px-2 py-0.5 text-rose-700 dark:text-rose-300">{f.category}</span>
                <span>to @{f.recipientUsername}</span>
                {f.hasSender && <span className="rounded bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-300">known sender</span>}
                <span>{dayjs(f.createdAt).format('MMM D, h:mm A')}</span>
              </div>
              <p className="mb-2 text-sm text-foreground">{f.content}</p>
              {f.reason && <p className="mb-2 text-xs text-muted-foreground">AI: {f.reason}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => reviewFlag(f._id, 'upheld')}>
                  Uphold{f.hasSender ? ' & ban sender' : ''}
                </Button>
                <Button size="sm" variant="outline" onClick={() => reviewFlag(f._id, 'dismissed')}>
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Roadmap' && (
        <div className="space-y-6">
          <div className="grid gap-2 rounded-lg border bg-card p-4 md:grid-cols-2">
            <Input
              placeholder="Feature title"
              value={newItem.title}
              onChange={(e) => setNewItem((s) => ({ ...s, title: e.target.value }))}
            />
            <Input
              placeholder="Target version (e.g. v2.0)"
              value={newItem.targetVersion}
              onChange={(e) => setNewItem((s) => ({ ...s, targetVersion: e.target.value }))}
            />
            <Input
              className="md:col-span-2"
              placeholder="Short description"
              value={newItem.description}
              onChange={(e) => setNewItem((s) => ({ ...s, description: e.target.value }))}
            />
            <Select
              value={newItem.status}
              onValueChange={(v) =>
                setNewItem((s) => ({ ...s, status: v as RoadmapItem['status'] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={createRoadmap}>Add item</Button>
          </div>

          <ul className="space-y-2">
            {roadmap.map((item) => (
              <li
                key={item._id}
                className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-foreground">
                    {item.title}{' '}
                    {item.targetVersion && (
                      <span className="text-xs text-muted-foreground">· {item.targetVersion}</span>
                    )}
                  </div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={item.status}
                    onValueChange={(v) =>
                      patchRoadmap(item._id, { status: v as RoadmapItem['status'] })
                    }
                  >
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => patchRoadmap(item._id, { isPublic: !item.isPublic })}
                  >
                    {item.isPublic ? 'Public' : 'Hidden'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteRoadmap(item._id)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
            {roadmap.length === 0 && (
              <p className="text-sm text-muted-foreground">No roadmap items yet.</p>
            )}
          </ul>
        </div>
      )}

      {tab === 'Settings' && settings && (
        <div className="max-w-md space-y-4 rounded-lg border bg-card p-5">
          {(
            [
              ['registrationOpen', 'Registration open'],
              ['aiEnabled', 'AI features enabled'],
              ['maintenanceMode', 'Maintenance mode'],
            ] as [keyof Settings, string][]
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{label}</span>
              <Switch
                checked={settings[key]}
                onCheckedChange={(v) => updateSetting({ [key]: v } as Partial<Settings>)}
              />
            </div>
          ))}
        </div>
      )}

      {tab === 'Audit' && (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">When</th>
                <th className="p-2">Admin</th>
                <th className="p-2">Action</th>
                <th className="p-2">Target</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a._id} className="border-t">
                  <td className="p-2 text-muted-foreground">{dayjs(a.createdAt).format('MMM D, h:mm A')}</td>
                  <td className="p-2">{a.adminUsername}</td>
                  <td className="p-2 font-medium">{a.action}</td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {a.targetType}:{a.targetId.slice(-6)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
