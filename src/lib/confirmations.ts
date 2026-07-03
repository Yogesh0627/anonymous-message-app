import mongoose from 'mongoose'
import UserModel from '@/models/user'
import ChangeConfirmationModel from '@/models/changeConfirmation'
import type { GrowthPlan } from '@/models/growthPlan'

/**
 * When a growth plan is completed, ask the people who gave attributed feedback
 * whether they notice a change. One request per distinct logged-in sender,
 * created idempotently (unique on plan+sender). See DESIGN.md §15.
 */
export async function spawnConfirmationsForPlan(
  receiverId: string | mongoose.Types.ObjectId,
  plan: Pick<GrowthPlan, '_id'>
): Promise<number> {
  const receiver = await UserModel.findById(receiverId).select('messages _id')
  if (!receiver) return 0

  const seen = new Set<string>()
  const targets: { senderId: mongoose.Types.ObjectId; messageId: mongoose.Types.ObjectId }[] = []

  for (const m of receiver.messages as any[]) {
    if (!m.senderId) continue
    const sid = String(m.senderId)
    if (sid === String(receiver._id) || seen.has(sid)) continue
    seen.add(sid)
    targets.push({ senderId: m.senderId, messageId: m._id })
  }

  let created = 0
  for (const t of targets) {
    try {
      await ChangeConfirmationModel.create({
        messageId: t.messageId,
        growthPlanId: plan._id,
        senderId: t.senderId,
        receiverId: receiver._id,
        status: 'pending',
      })
      created += 1
    } catch (error: any) {
      if (error?.code !== 11000) throw error // duplicate → already requested
    }
  }
  return created
}
