'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  X,
} from 'lucide-react'
import { SimpleTooltip } from './ui/tooltip'
import ThemeToggle from './ThemeToggle'
import { useMobileNav } from './MobileNav'
import { useEscapeKey, useFocusTrap, useScrollLock } from '@/hooks/useModalA11y'

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
  const { open, setOpen } = useMobileNav()
  const drawerRef = useRef<HTMLElement>(null)
  const closeDrawer = useCallback(() => setOpen(false), [setOpen])

  const [collapsed, setCollapsed] = useState(false)

  // Remember the collapsed preference across visits.
  useEffect(() => {
    setCollapsed(localStorage.getItem('candor:sidebar') === 'collapsed')
  }, [])

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false)
  }, [pathname, setOpen])

  // Drawer behaves like a modal dialog on mobile.
  useEscapeKey(open, closeDrawer)
  useFocusTrap(drawerRef, open)
  useScrollLock(open)

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('candor:sidebar', next ? 'collapsed' : 'expanded')
      return next
    })
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  // `collapsed` only applies to the desktop rail; the mobile drawer is always
  // expanded. `onNavigate` closes the drawer after a tap on mobile.
  const item = (
    href: string,
    label: string,
    Icon: LucideIcon,
    activeClass: string,
    isCollapsed: boolean,
    onNavigate?: () => void,
  ) => {
    const link = (
      <Link
        href={href}
        onClick={onNavigate}
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          isActive(href)
            ? activeClass
            : 'text-muted-foreground hover:bg-muted dark:text-muted-foreground dark:hover:bg-muted'
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && <span>{label}</span>}
      </Link>
    )
    return isCollapsed ? (
      <SimpleTooltip key={href} label={label} side="right">
        {link}
      </SimpleTooltip>
    ) : (
      <div key={href}>{link}</div>
    )
  }

  // Shared inner content for both the desktop rail and the mobile drawer.
  const content = (isCollapsed: boolean, onNavigate?: () => void) => (
    <>
      <div className="flex items-center justify-between p-4">
        {!isCollapsed && (
          <Link href="/dashboard" onClick={onNavigate} className="leading-tight">
            <div className="text-lg font-bold text-foreground">Candor</div>
            <div className="text-[10px] text-muted-foreground dark:text-muted-foreground">
              Honest feedback, real growth
            </div>
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

      <nav className="flex-1 space-y-1 px-2">
        {NAV.map((n) =>
          item(n.href, n.label, n.icon, 'bg-brand/10 font-medium text-brand dark:bg-brand/15 dark:text-brand', isCollapsed, onNavigate),
        )}
      </nav>

      <div className="space-y-2 border-t p-2">
        <ThemeToggle collapsed={isCollapsed} />
        {isAdmin &&
          item('/admin', 'Admin Dashboard', Shield, 'bg-amber-50 font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', isCollapsed, onNavigate)}
        {(() => {
          const signOutBtn = (
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted dark:text-muted-foreground dark:hover:bg-muted"
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
          <div className="truncate px-3 pt-1 text-xs text-muted-foreground dark:text-muted-foreground">
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
          aria-label="Main navigation"
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
