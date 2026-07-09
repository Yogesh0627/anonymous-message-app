import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import Footer from '@/components/Footer'
import AppGuard from '@/components/AppGuard'
import OnboardingTour from '@/components/OnboardingTour'
import { MobileNavProvider } from '@/components/MobileNav'

// App shell for authenticated sections: sidebar + topbar + content + footer.
// The global Navbar hides itself on these routes. MobileNavProvider shares the
// drawer open/close state between the Topbar hamburger and the Sidebar drawer.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileNavProvider>
      <div className="flex min-h-screen bg-muted">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1">
            <AppGuard>{children}</AppGuard>
          </main>
          <Footer />
        </div>
        <OnboardingTour />
      </div>
    </MobileNavProvider>
  )
}
