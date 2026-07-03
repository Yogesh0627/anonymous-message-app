import { describe, it, expect } from "vitest"
import { getOrCompute } from "./cache"
import { consumeAiQuota, grantAiBonus, getQuotaStatus } from "./quota"

describe("getOrCompute", () => {
  it("computes once, then serves from cache", async () => {
    let calls = 0
    const compute = async () => {
      calls += 1
      return { value: 42 }
    }

    const first = await getOrCompute("cache-test-1", 10_000, compute)
    const second = await getOrCompute("cache-test-1", 10_000, compute)

    expect(first).toEqual({ value: 42 })
    expect(second).toEqual({ value: 42 })
    expect(calls).toBe(1)
  })
})

describe("consumeAiQuota", () => {
  it("allows up to the daily limit, then blocks", async () => {
    process.env.DAILY_AI_CALLS = "2"
    const user = "quota-user-a"

    expect((await consumeAiQuota(user)).ok).toBe(true)
    expect((await consumeAiQuota(user)).ok).toBe(true)

    const third = await consumeAiQuota(user)
    expect(third.ok).toBe(false)
    expect(third.limit).toBe(2)
  })

  it("raises the effective limit after a credit-redeemed bonus", async () => {
    process.env.DAILY_AI_CALLS = "1"
    const user = "quota-user-b"

    expect((await consumeAiQuota(user)).ok).toBe(true)
    expect((await consumeAiQuota(user)).ok).toBe(false)

    await grantAiBonus(user, 5)
    expect((await consumeAiQuota(user)).ok).toBe(true)
  })
})

describe("getQuotaStatus", () => {
  it("reads usage without consuming, and reflects the bonus", async () => {
    process.env.DAILY_AI_CALLS = "5"
    const user = "quota-status-user"

    const before = await getQuotaStatus(user)
    expect(before).toMatchObject({ used: 0, limit: 5, remaining: 5 })

    // peeking again must NOT increment usage
    await getQuotaStatus(user)
    expect((await getQuotaStatus(user)).used).toBe(0)

    await consumeAiQuota(user)
    await consumeAiQuota(user)
    expect(await getQuotaStatus(user)).toMatchObject({ used: 2, remaining: 3 })

    await grantAiBonus(user, 10)
    expect(await getQuotaStatus(user)).toMatchObject({ limit: 15, remaining: 13 })
  })
})
