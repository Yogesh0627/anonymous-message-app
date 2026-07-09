import { getStore } from "@/lib/store"

/**
 * Per-user daily AI-call budget (§5.3 of DESIGN.md). Every model-backed request
 * (composer, coach) consumes one unit. When credits are later redeemed for AI
 * usage (Part 2), the redeemed bonus for the day is added to the base limit.
 *
 * Ephemeral by design — counters live in the KV store and roll over daily via
 * the date-stamped key, so nothing needs cleaning up.
 */

const DAY_MS = 24 * 60 * 60 * 1000

function dayKey(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

export function baseDailyLimit(): number {
  const configured = Number(process.env.DAILY_AI_CALLS)
  return Number.isFinite(configured) && configured > 0 ? configured : 50
}

/** Reads (without consuming) the credit-redeemed bonus for today. */
export async function getRedeemedBonus(userId: string): Promise<number> {
  const bonus = await getStore().get<number>(`quota:bonus:${userId}:${dayKey()}`)
  return bonus ?? 0
}

export type QuotaResult = { ok: boolean; used: number; limit: number }

/**
 * Atomically consumes one unit of the user's daily AI budget and reports whether
 * they were within the limit. Callers should return 402 when `ok` is false.
 */
export async function consumeAiQuota(userId: string): Promise<QuotaResult> {
  const bonus = await getRedeemedBonus(userId)
  const limit = baseDailyLimit() + bonus
  const { count } = await getStore().incr(`quota:${userId}:${dayKey()}`, DAY_MS)
  return { ok: count <= limit, used: count, limit }
}

export type QuotaStatus = {
  used: number
  base: number
  bonus: number
  limit: number
  remaining: number
}

/** Reads the user's current AI budget for today WITHOUT consuming any. */
export async function getQuotaStatus(userId: string): Promise<QuotaStatus> {
  const [used, bonus] = await Promise.all([
    getStore().peek(`quota:${userId}:${dayKey()}`),
    getRedeemedBonus(userId),
  ])
  const base = baseDailyLimit()
  const limit = base + bonus
  return { used, base, bonus, limit, remaining: Math.max(0, limit - used) }
}

/**
 * Grants extra AI calls for the rest of today (used by credit redemption).
 *
 * Uses an atomic incrBy rather than a read-modify-write: two redemptions racing
 * would otherwise both read the same base and one would clobber the other, so a
 * user could spend credits and not receive the bonus (a lost update).
 */
export async function grantAiBonus(userId: string, amount: number): Promise<void> {
  await getStore().incrBy(`quota:bonus:${userId}:${dayKey()}`, amount, DAY_MS)
}
