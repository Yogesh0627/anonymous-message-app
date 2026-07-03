'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import InboxCoach from '@/components/InboxCoach'
import GrowthBoard from '@/components/GrowthBoard'

const CoachPage = () => {
  const { data: session } = useSession()
  const [planRefresh, setPlanRefresh] = useState(0)

  if (!session?.user) return null

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">AI Coach</h1>
        <p className="text-muted-foreground">
          Analyze your feedback, accept a plan, and track it through To Do → In Progress → Completed.
        </p>
      </div>

      <InboxCoach onPlanAccepted={() => setPlanRefresh((n) => n + 1)} />

      <GrowthBoard refreshKey={planRefresh} />
    </div>
  )
}

export default CoachPage
