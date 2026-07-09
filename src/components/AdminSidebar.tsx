'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import axios from 'axios'
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Users,
  ShieldAlert,
  Map,
  Settings,
  ScrollText,
  ArrowLeft,
  LogOut,
  X,
  type LucideIcon,
} from 'lucide-react'
import { SimpleTooltip } from './ui/tooltip'
import ThemeToggle from './ThemeToggle'
import { useMobileNav } from './MobileNav'
import { useEscapeKey, useFocusTrap, useScrollLock } from '@/hooks/useModalA11y'

// Sections map to the ?tab= query on /admin, mirroring the single-page console.
const NAV: { tab: string; label: string; icon: LucideIcon }[] = [
  { tab: 'Overview', label: 'Overview', icon: LayoutDashboard },
  { tab: 'Users', label: 'Users', icon: Users },
  { tab: 'Moderation', label: 'Moderation', icon: ShieldAlert },
  { tab: 'Roadmap', label: 'Roadmap', icon: Map },
  { tab: 'Settings', label: 'Settings', icon: Settings },
  { tab: 'Audit', label: 'Audit', icon: ScrollText },
]

export default function AdminSidebar() {
  const params = useSearchParams()
  const active = params.get('tab') ?? 'Overview'
  const { data: session } = useSession()
  const { open, setOpen } = useMobileNav()
  const drawerRef = useRef<HTMLElement>(null)
  const closeDrawer = useCallback(() => setOpen(false), [setOpen])
  const [collapsed, setCollapsed] = useState(false)
  const [pendingFlags, setPendingFlags] = useState(0)

  useEffect(() => {
    setCollapsed(localStorage.getItem('candor:adminsidebar') === 'collapsed')
  }, [])
  useEffect(() => {
    axios
      .get('/api/admin/stats')
      .then((r) => setPendingFlags(r.data?.stats?.pendingFlags ?? 0))
      .catch(() => {})
  }, [])

  // Close the mobile drawer when the active tab changes.
  useEffect(() => {
    setOpen(false)
  }, [active, setOpen])

  // Drawer behaves like a modal dialog on mobile.
  useEscapeKey(open, closeDrawer)
  useFocusTrap(drawerRef, open)
  useScrollLock(open)

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('candor:adminsidebar', next ? 'collapsed' : 'expanded')
      return next
    })
  }

  const item = (
    { tab, label, icon: Icon }: (typeof NAV)[number],
    isCollapsed: boolean,
    onNavigate?: () => void,
  ) => {
    const isActive = active === tab
    const badge = tab === 'Moderation' && pendingFlags > 0
    const link = (
      <Link
        href={`/admin?tab=${tab}`}
        onClick={onNavigate}
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-brand/10 font-medium text-brand dark:bg-brand/15'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && <span className="flex-1">{label}</span>}
        {!isCollapsed && badge && (
          <span className="rounded-full bg-rose-500 px-1.5 text-xs font-medium text-white">
            {pendingFlags}
          </span>
        )}
        {isCollapsed && badge && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
        )}
      </Link>
    )
    return isCollapsed ? (
      <SimpleTooltip key={tab} label={label} side="right">
        <div className="relative">{link}</div>
      </SimpleTooltip>
    ) : (
      <div key={tab}>{link}</div>
    )
  }

  const content = (isCollapsed: boolean, onNavigate?: () => void) => (
    <>
      <div className="flex items-center justify-between p-4">
        {!isCollapsed && (
          <Link href="/admin" onClick={onNavigate} className="leading-tight">
            <div className="text-lg font-bold text-foreground">Candor</div>
            <div className="text-[10px] uppercase tracking-wide text-brand">Admin console</div>
          </Link>
        )}
        {onNavigate ? (
          <button
            onClick={onNavigate}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <SimpleTooltip label={isCollapsed ? 'Expand' : 'Collapse'} side="right">
            <button
              onClick={toggle}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Toggle sidebar"
            >
              {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
          </SimpleTooltip>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2">{NAV.map((n) => item(n, isCollapsed, onNavigate))}</nav>

      <div className="space-y-2 border-t p-2">
        <ThemeToggle collapsed={isCollapsed} />
        {(() => {
          const back = (
            <Link
              href="/dashboard"
              onClick={onNavigate}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>Back to app</span>}
            </Link>
          )
          return isCollapsed ? (
            <SimpleTooltip label="Back to app" side="right">
              {back}
            </SimpleTooltip>
          ) : (
            back
          )
        })()}
        {(() => {
          const signOutBtn = (
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>Sign out</span>}
            </button>
          )
          return isCollapsed ? (
            <SimpleTooltip label="Sign out" side="right">
              {signOutBtn}
            </SimpleTooltip>
          ) : (
            signOutBtn
          )
        })()}
        {!isCollapsed && session?.user && (
          <div className="truncate px-3 pt-1 text-xs text-muted-foreground">
            {session.user.username || session.user.email}
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Desktop rail */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-card transition-all duration-200 md:flex ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {content(collapsed)}
      </aside>

      {/* Mobile off-canvas drawer. `invisible` (not just translated off-screen)
          keeps its links out of the tab order while closed; transitioning
          visibility lets the slide-out animation finish first. */}
      <div
        className={`transition-[visibility] duration-200 md:hidden ${
          open ? 'visible' : 'invisible pointer-events-none'
        }`}
      >
        <div
          onClick={closeDrawer}
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />
        <aside
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
          className={`fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col border-r bg-card shadow-xl transition-transform duration-200 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {content(false, closeDrawer)}
        </aside>
      </div>
    </>
  )
}
