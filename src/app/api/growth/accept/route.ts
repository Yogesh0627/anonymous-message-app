import { connectDB } from '@/dbConfig/db'
import GrowthPlanModel from '@/models/growthPlan'
import { authOptions } from '../../auth/[...nextauth]/options'
import { getServerSession, User } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { acceptPlanSchema } from '@/inputValidations/growthSchema'
import { award } from '@/lib/credits'
import { CREDIT_REASONS } from '@/lib/creditRules'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as User | undefined
  if (!session || !user?._id) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  }

  const parsed = acceptPlanSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  await connectDB()

  const sourceMessageIds = (parsed.data.sourceMessageIds ?? [])
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id))

  const plan = await GrowthPlanModel.create({
    userId: user._id,
    title: parsed.data.title,
    summary: parsed.data.summary,
    sourceMessageIds,
    tasks: parsed.data.tasks.map((title, i) => ({ id: String(i), title, done: false })),
    status: 'active',
  })

  // +5 for accepting a plan (idempotent on the plan id).
  await award(user._id, CREDIT_REASONS.ACCEPT_PLAN, String(plan._id))

  return NextResponse.json({ success: true, message: 'Plan accepted', plan }, { status: 201 })
}
