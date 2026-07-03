import mongoose from 'mongoose'
import CreditEntryModel from '@/models/creditEntry'
import UserModel from '@/models/user'
import {
  CREDIT_AMOUNTS,
  DAILY_ACTION_CAPS,
  type CreditReason,
} from '@/lib/creditRules'

type Id = string | mongoose.Types.ObjectId

/**
 * Ledger operations for the credit economy (DESIGN.md §16).
 *
 * Invariants:
 * - The ledger is append-only and the source of truth; `User.credits` is a
 *   denormalized cache kept in sync via $inc.
 * - Every mutation is idempotent on (userId, reason, refId): a duplicate event
 *   (retry, double-click) is a no-op, never a double credit.
 */

/** Awards credits for an earn action. Returns whether it actually credited. */
export async function award(
  userId: Id,
  reason: CreditReason,
  refId: string,
  options?: { delta?: number; refType?: string }
): Promise<{ awarded: boolean; delta: number }> {
  const delta = options?.delta ?? CREDIT_AMOUNTS[reason]
  const refType = options?.refType ?? reason

  try {
    await CreditEntryModel.create({ userId, delta, reason, refType, refId })
  } catch (error: any) {
    // Duplicate key → this event was already recorded. Idempotent no-op.
    if (error?.code === 11000) return { awarded: false, delta: 0 }
    throw error
  }

  await UserModel.updateOne({ _id: userId }, { $inc: { credits: delta } })
  return { awarded: true, delta }
}

/**
 * Spends credits (e.g. redemption). Atomically checks balance and decrements,
 * then records the ledger debit. Returns ok=false if the balance is
 * insufficient or the debit was already recorded.
 */
export async function spend(
  userId: Id,
  amount: number,
  reason: CreditReason,
  refId: string
): Promise<{ ok: boolean }> {
  const decremented = await UserModel.updateOne(
    { _id: userId, credits: { $gte: amount } },
    { $inc: { credits: -amount } }
  )
  if (decremented.modifiedCount === 0) return { ok: false }

  try {
    await CreditEntryModel.create({
      userId,
      delta: -amount,
      reason,
      refType: reason,
      refId,
    })
  } catch (error: any) {
    if (error?.code === 11000) {
      // Already recorded — undo the decrement we just applied.
      await UserModel.updateOne({ _id: userId }, { $inc: { credits: amount } })
      return { ok: false }
    }
    throw error
  }

  return { ok: true }
}

export async function getBalance(userId: Id): Promise<number> {
  const user = await UserModel.findById(userId).select('credits')
  return user?.credits ?? 0
}

export async function getRecentEntries(userId: Id, limit = 20) {
  return CreditEntryModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean()
}

/** Counts how many times an action credited today (for daily-cap enforcement). */
export async function countTodayAwards(userId: Id, reason: CreditReason): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  return CreditEntryModel.countDocuments({
    userId,
    reason,
    delta: { $gt: 0 },
    createdAt: { $gte: startOfDay },
  })
}

/** True if the user is still under the daily cap for this earn action. */
export async function underDailyCap(userId: Id, reason: CreditReason): Promise<boolean> {
  const cap = DAILY_ACTION_CAPS[reason]
  if (cap === undefined) return true
  return (await countTodayAwards(userId, reason)) < cap
}
