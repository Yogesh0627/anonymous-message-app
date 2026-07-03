import { connectDB } from '@/dbConfig/db'
import GrowthPlanModel from '@/models/growthPlan'
import CheckInModel from '@/models/checkIn'
import { authOptions } from '../../auth/[...nextauth]/options'
import { getServerSession, User } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { checkInSchema } from '@/inputValidations/growthSchema'
import { award } from '@/lib/credits'
import { CREDIT_REASONS } from '@/lib/creditRules'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as User | undefined
  if (!session || !user?._id) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  }

  const parsed = checkInSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  await connectDB()

  const plan = await GrowthPlanModel.findOne({ _id: parsed.data.planId, userId: user._id })
  if (!plan) {
    return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 })
  }

  const date = new Date().toISOString().slice(0, 10)

  try {
    await CheckInModel.create({
      userId: user._id,
      growthPlanId: plan._id,
      date,
      note: parsed.data.note,
      mood: parsed.data.mood,
    })
  } catch (error: any) {
    // Unique (growthPlanId, date) → already checked in today.
    if (error?.code === 11000) {
      return NextResponse.json(
        { success: false, message: "You've already checked in today." },
        { status: 409 }
      )
    }
    throw error
  }

  // +10 per day, idempotent on plan+date (matches the unique check-in).
  await award(user._id, CREDIT_REASONS.DAILY_CHECKIN, `${plan._id}:${date}`)

  return NextResponse.json({ success: true, message: 'Check-in saved (+10 credits)' }, { status: 201 })
}
