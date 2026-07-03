'use client'
import InboxAnalytics from '@/components/InboxAnalytics'
import FeedbackGiven from '@/components/FeedbackGiven'
import CreditsWidget from '@/components/CreditsWidget'
import GrowthProgress from '@/components/GrowthProgress'
import { useSession } from 'next-auth/react'

const Dashboard = () => {
  const { data: session } = useSession()

  if (!session?.user) return null

  return (
    <div className="mx-auto w-full max-w-5xl p-6 md:p-8">
      <h1 className="mb-1 text-3xl font-bold text-foreground">
        Welcome back, {session.user.username || 'there'} 👋
      </h1>
      <p className="mb-6 text-muted-foreground">
        Here&apos;s a snapshot of your anonymous feedback and rewards.
      </p>

      <div className="space-y-6">
        <CreditsWidget refreshKey={0} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <GrowthProgress />
          <InboxAnalytics />
        </div>

        <FeedbackGiven />
      </div>
    </div>
  )
}

export default Dashboard
