'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  MessageSquare,
  Map,
  Shield,
  Sparkles,
  User as UserIcon,
} from 'lucide-react'
import { SimpleTooltip } from './ui/tooltip'
import ThemeToggle from './ThemeToggle'

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/coach', label: 'Coach', icon: Sparkles },
  { href: '/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/help', label: 'Help', icon: HelpCircle },
  { href: '/roadmap', label: 'Roadmap', icon: Map },
  { href: '/profile', label: 'Profile', icon: UserIcon },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'

  const [collapsed, setCollapsed] = useState(false)

  // Remember the collapsed preference across visits.
  useEffect(() => {
    setCollapsed(localStorage.getItem('candor:sidebar') === 'collapsed')
  }, [])
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('candor:sidebar', next ? 'collapsed' : 'expanded')
      return next
    })
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  const item = (href: string, label: string, Icon: LucideIcon, activeClass: string) => {
    const link = (
      <Link
        href={href}
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          isActive(href)
            ? activeClass
            : 'text-muted-foreground hover:bg-muted dark:text-muted-foreground dark:hover:bg-muted'
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{label}</span>}
      </Link>
    )
    return collapsed ? (
      <SimpleTooltip key={href} label={label} side="right">
        {link}
      </SimpleTooltip>
    ) : (
      <div key={href}>{link}</div>
    )
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r bg-card transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex items-center justify-between p-4">
        {!collapsed && (
          <Link href="/dashboard" className="leading-tight">
            <div className="text-lg font-bold text-foreground">Candor</div>
            <div className="text-[10px] text-muted-foreground dark:text-muted-foreground">
              Honest feedback, real growth
            </div>
          </Link>
        )}
        <SimpleTooltip label={collapsed ? 'Expand' : 'Collapse'} side="right">
          <button
            onClick={toggle}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </SimpleTooltip>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {NAV.map((n) => item(n.href, n.label, n.icon, 'bg-brand/10 font-medium text-brand dark:bg-brand/15 dark:text-brand'))}
      </nav>

      <div className="space-y-2 border-t p-2">
        <ThemeToggle collapsed={collapsed} />
        {isAdmin &&
          item('/admin', 'Admin Dashboard', Shield, 'bg-amber-50 font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300')}
        {(() => {
          const signOutBtn = (
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted dark:text-muted-foreground dark:hover:bg-muted"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Sign out</span>}
            </button>
          )
          return collapsed ? (
            <SimpleTooltip label="Sign out" side="right">
              {signOutBtn}
            </SimpleTooltip>
          ) : (
            signOutBtn
          )
        })()}
        {!collapsed && session?.user && (
          <div className="truncate px-3 pt-1 text-xs text-muted-foreground dark:text-muted-foreground">
            {session.user.username || session.user.email}
          </div>
        )}
      </div>
    </aside>
  )
}
