import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { checkRateLimit } from "./rateLimit"

// No Upstash env in tests → the limiter runs against the in-memory store.
describe("checkRateLimit (in-memory store)", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("allows requests up to the limit", async () => {
    const key = "test-allow"
    expect((await checkRateLimit(key, { limit: 3, windowMs: 1000 })).success).toBe(true)
    expect((await checkRateLimit(key, { limit: 3, windowMs: 1000 })).success).toBe(true)
    expect((await checkRateLimit(key, { limit: 3, windowMs: 1000 })).success).toBe(true)
  })

  it("blocks requests beyond the limit within the window", async () => {
    const key = "test-block"
    await checkRateLimit(key, { limit: 2, windowMs: 1000 })
    await checkRateLimit(key, { limit: 2, windowMs: 1000 })
    const blocked = await checkRateLimit(key, { limit: 2, windowMs: 1000 })
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it("resets after the window elapses", async () => {
    const key = "test-reset"
    await checkRateLimit(key, { limit: 1, windowMs: 1000 })
    expect((await checkRateLimit(key, { limit: 1, windowMs: 1000 })).success).toBe(false)

    vi.setSystemTime(1001)
    expect((await checkRateLimit(key, { limit: 1, windowMs: 1000 })).success).toBe(true)
  })

  it("tracks separate keys independently", async () => {
    await checkRateLimit("key-a", { limit: 1, windowMs: 1000 })
    expect((await checkRateLimit("key-b", { limit: 1, windowMs: 1000 })).success).toBe(true)
  })
})
