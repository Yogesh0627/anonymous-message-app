'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Skeleton } from './ui/skeleton'

const PageSkeleton = () => (
  <div className="mx-auto w-full max-w-5xl space-y-5 p-6 md:p-8">
    <Skeleton className="h-8 w-56" />
    <Skeleton className="h-4 w-80" />
    <div className="grid gap-5 md:grid-cols-2">
      <Skeleton className="h-44 rounded-lg" />
      <Skeleton className="h-44 rounded-lg" />
    </div>
    <Skeleton className="h-40 w-full rounded-lg" />
  </div>
)

/**
 * Gates authenticated app pages: shows a skeleton while the session is loading
 * (avoids a "please log in" flash on refresh) and bounces to sign-in if the
 * user is genuinely logged out.
 */
export default function AppGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/sign-in')
  }, [status, router])

  if (status !== 'authenticated') return <PageSkeleton />
  return <>{children}</>
}
