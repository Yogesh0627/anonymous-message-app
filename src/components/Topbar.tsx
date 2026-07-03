'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { Zap } from 'lucide-react'
import { SimpleTooltip } from './ui/tooltip'

const TITLES: [string, string][] = [
  ['/dashboard', 'Dashboard'],
  ['/coach', 'AI Coach'],
  ['/feedback', 'Feedback Inbox'],
  ['/help', 'Help'],
  ['/roadmap', 'Roadmap'],
  ['/profile', 'Profile'],
]

export default function Topbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [remaining, setRemaining] = useState<number | null>(null)

  // Refresh the AI-call count on every navigation so it reflects recent usage.
  useEffect(() => {
    let active = true
    axios
      .get('/api/quota')
      .then((res) => active && setRemaining(res.data.quota?.remaining ?? null))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [pathname])

  const title =
    TITLES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`))?.[1] ?? 'Candor'
  const username = session?.user?.username || 'user'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/80 px-4 backdrop-blur md:px-6">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>

      <div className="flex items-center gap-3">
        <SimpleTooltip label="AI calls remaining today — redeem credits for more" side="bottom">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            {remaining === null ? '…' : `${remaining} AI`}
          </Link>
        </SimpleTooltip>

        <SimpleTooltip label="Your profile" side="bottom">
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-muted"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand dark:bg-brand/20 dark:text-brand">
              {username.charAt(0).toUpperCase()}
            </span>
            <span className="hidden text-sm text-muted-foreground sm:inline">{username}</span>
          </Link>
        </SimpleTooltip>
      </div>
    </header>
  )
}
