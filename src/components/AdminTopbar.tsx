'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ExternalLink, Menu, ShieldCheck } from 'lucide-react'
import { SimpleTooltip } from './ui/tooltip'
import { useMobileNav } from './MobileNav'

const TITLES: Record<string, string> = {
  Overview: 'Overview',
  Users: 'User management',
  Moderation: 'Moderation queue',
  Roadmap: 'Roadmap editor',
  Settings: 'App settings',
  Audit: 'Audit log',
}

export default function AdminTopbar() {
  const params = useSearchParams()
  const tab = params.get('tab') ?? 'Overview'
  const { data: session } = useSession()
  const { toggle } = useMobileNav()
  const username = session?.user?.username || 'admin'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/80 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={toggle}
          className="-ml-1 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <ShieldCheck className="h-4 w-4 shrink-0 text-brand" />
        <h2 className="truncate text-sm font-semibold text-foreground">{TITLES[tab] ?? 'Admin'}</h2>
      </div>

      <div className="flex items-center gap-3">
        <SimpleTooltip label="Open the live app" side="bottom">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View site
          </Link>
        </SimpleTooltip>

        <SimpleTooltip label="Your profile" side="bottom">
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-muted"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand dark:bg-brand/20">
              {username.charAt(0).toUpperCase()}
            </span>
            <span className="hidden text-sm text-muted-foreground sm:inline">{username}</span>
          </Link>
        </SimpleTooltip>
      </div>
    </header>
  )
}
