import { Suspense } from 'react'
import Footer from '@/components/Footer'
import AppGuard from '@/components/AppGuard'
import AdminSidebar from '@/components/AdminSidebar'
import AdminTopbar from '@/components/AdminTopbar'
import { MobileNavProvider } from '@/components/MobileNav'

// Admin shell — mirrors the app shell (sidebar + topbar + footer) so the console
// feels consistent with the user side. Admin-role access is enforced in
// src/middleware.ts. Suspense wraps the useSearchParams-driven chrome.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileNavProvider>
      <div className="flex min-h-screen bg-muted">
        <Suspense fallback={<div className="hidden w-60 shrink-0 border-r bg-card md:block" />}>
          <AdminSidebar />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <Suspense fallback={<div className="h-14 border-b bg-card/80" />}>
            <AdminTopbar />
          </Suspense>
          <main className="flex-1">
            <AppGuard>{children}</AppGuard>
          </main>
          <Footer />
        </div>
      </div>
    </MobileNavProvider>
  )
}
