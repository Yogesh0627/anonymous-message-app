import { connectDB } from '@/dbConfig/db'
import GrowthPlanModel from '@/models/growthPlan'
import CheckInModel from '@/models/checkIn'
import UserModel from '@/models/user'
import { authOptions } from '../../auth/[...nextauth]/options'
import { getServerSession, User } from 'next-auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as User | undefined
  if (!session || !user?._id) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  }

  await connectDB()

  const plans = await GrowthPlanModel.find({ userId: user._id })
    .sort({ status: 1, createdAt: -1 })
    .lean()

  const planIds = plans.map((p) => p._id)
  const checkIns = await CheckInModel.find({ growthPlanId: { $in: planIds } })
    .sort({ date: 1 })
    .lean()

  // Attach each plan's check-ins for the self-rating chart.
  const byPlan = new Map<string, any[]>()
  for (const c of checkIns) {
    const key = String(c.growthPlanId)
    if (!byPlan.has(key)) byPlan.set(key, [])
    byPlan.get(key)!.push({ date: c.date, note: c.note, mood: c.mood })
  }

  // Map each plan's sourceMessageIds back to the feedback text that inspired it,
  // so the board can show "which feedback this plan addresses".
  const owner = await UserModel.findById(user._id).select('messages').lean()
  const messageMap = new Map<string, string>()
  for (const m of ((owner as any)?.messages ?? [])) {
    messageMap.set(String(m._id), String(m.content))
  }

  const withDetails = plans.map((p) => ({
    ...p,
    checkIns: byPlan.get(String(p._id)) ?? [],
    sources: ((p as any).sourceMessageIds ?? [])
      .map((id: any) => messageMap.get(String(id)))
      .filter(Boolean)
      .map((content: string) => (content.length > 140 ? `${content.slice(0, 140)}…` : content)),
  }))

  return NextResponse.json({ success: true, message: 'Plans fetched', plans: withDetails })
}
