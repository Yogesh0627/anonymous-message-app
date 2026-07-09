'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Shared open/close state for the mobile navigation drawer. The hamburger lives
// in the Topbar while the drawer itself lives in the Sidebar, so the state is
// lifted into a small context that wraps the whole app/admin shell.
type MobileNavContextValue = {
  open: boolean
  setOpen: (value: boolean) => void
  toggle: () => void
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null)

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((o) => !o), [])

  // The drawer only exists below `md`. If the viewport grows while it's open,
  // close it — otherwise its scroll lock would stay applied to a desktop page.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)')
    const sync = () => desktop.matches && setOpen(false)
    sync()
    desktop.addEventListener('change', sync)
    return () => desktop.removeEventListener('change', sync)
  }, [])

  return (
    <MobileNavContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </MobileNavContext.Provider>
  )
}

export function useMobileNav(): MobileNavContextValue {
  const ctx = useContext(MobileNavContext)
  // A no-op fallback keeps consumers safe if rendered outside the provider.
  if (!ctx) return { open: false, setOpen: () => {}, toggle: () => {} }
  return ctx
}
