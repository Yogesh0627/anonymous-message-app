import { connectDB } from '@/dbConfig/db'
import GrowthPlanModel from '@/models/growthPlan'
import { authOptions } from '../../auth/[...nextauth]/options'
import { getServerSession, User } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { toggleTaskSchema } from '@/inputValidations/growthSchema'
import { spawnConfirmationsForPlan } from '@/lib/confirmations'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as User | undefined
  if (!session || !user?._id) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  }

  const parsed = toggleTaskSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid input' }, { status: 400 })
  }

  await connectDB()

  const plan = await GrowthPlanModel.findOne({ _id: parsed.data.planId, userId: user._id })
  if (!plan) {
    return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 })
  }

  const task = plan.tasks.find((t) => t.id === parsed.data.taskId)
  if (!task) {
    return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 })
  }

  task.done = parsed.data.done
  task.doneAt = parsed.data.done ? new Date() : undefined

  // Auto-complete the plan when every task is done. (Loop-back confirmations
  // are spawned from this transition in Phase 4d.)
  const allDone = plan.tasks.length > 0 && plan.tasks.every((t) => t.done)
  const justCompleted = allDone && plan.status === 'active'
  if (justCompleted) {
    plan.status = 'completed'
    plan.completedAt = new Date()
  } else if (!allDone && plan.status === 'completed') {
    plan.status = 'active'
    plan.completedAt = undefined
  }

  await plan.save()

  // On completion, ask the senders who gave attributed feedback for confirmation.
  if (justCompleted) {
    await spawnConfirmationsForPlan(String(user._id), plan)
  }

  return NextResponse.json({ success: true, message: 'Task updated', plan }, { status: 200 })
}
