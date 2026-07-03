'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Monitor, Sun, type LucideIcon } from 'lucide-react'
import { SimpleTooltip } from './ui/tooltip'

const OPTIONS: { value: string; icon: LucideIcon; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'system', icon: Monitor, label: 'System' },
  { value: 'dark', icon: Moon, label: 'Dark' },
]

export default function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Avoid a hydration mismatch — the theme isn't known on the server.
  if (!mounted) return <div className="h-9" />

  if (collapsed) {
    const order = ['light', 'dark', 'system']
    const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[1]
    const Icon = current.icon
    const next = order[(order.indexOf(theme ?? 'system') + 1) % order.length]
    return (
      <SimpleTooltip label={`Theme: ${current.label}`} side="right">
        <button
          onClick={() => setTheme(next)}
          className="flex w-full items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Icon className="h-5 w-5" />
        </button>
      </SimpleTooltip>
    )
  }

  return (
    <div className="flex gap-1 rounded-md border bg-card p-1">
      {OPTIONS.map((o) => {
        const Icon = o.icon
        const active = theme === o.value
        return (
          <SimpleTooltip key={o.value} label={o.label}>
            <button
              onClick={() => setTheme(o.value)}
              className={`flex flex-1 items-center justify-center rounded py-1.5 transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          </SimpleTooltip>
        )
      })}
    </div>
  )
}
