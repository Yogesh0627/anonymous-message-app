import { describe, it, expect } from "vitest"
import { generateOtp, hashOtp, isOtpUnexpired, verifyOtp } from "./otp"

describe("generateOtp", () => {
  it("returns a 6-digit numeric string", async () => {
    for (let i = 0; i < 25; i++) {
      expect(generateOtp()).toMatch(/^\d{6}$/)
    }
  })
})

describe("verifyOtp", () => {
  it("accepts the correct code against its hash", async () => {
    const code = "123456"
    expect(await verifyOtp(code, await hashOtp(code))).toBe(true)
  })

  it("rejects a wrong code", async () => {
    expect(await verifyOtp("000000", await hashOtp("123456"))).toBe(false)
  })

  it("never stores the code in plaintext", async () => {
    const code = "123456"
    expect(await hashOtp(code)).not.toContain(code)
  })

  // Regression: a consumed code is cleared to ''. Previously the route compared
  // `user.forgotPasswordCode === code`, so posting an empty code matched the
  // cleared value and replayed the password reset. Empty input must never verify.
  it("rejects an empty code and a burned (cleared) hash", async () => {
    const hash = await hashOtp("123456")
    expect(await verifyOtp("", hash)).toBe(false)
    expect(await verifyOtp("123456", "")).toBe(false)
    expect(await verifyOtp("", "")).toBe(false)
    expect(await verifyOtp("123456", undefined)).toBe(false)
  })

  it("rejects a malformed hash rather than throwing", async () => {
    // e.g. a legacy plaintext value left in the database
    expect(await verifyOtp("000000", "000000")).toBe(false)
  })
})

describe("isOtpUnexpired", () => {
  it("is true only for a future expiry", () => {
    expect(isOtpUnexpired(new Date(Date.now() + 60_000))).toBe(true)
    expect(isOtpUnexpired(new Date(Date.now() - 60_000))).toBe(false)
    // The burn sentinel written when a code is consumed.
    expect(isOtpUnexpired(new Date(0))).toBe(false)
    expect(isOtpUnexpired(undefined)).toBe(false)
    expect(isOtpUnexpired(new Date("nonsense"))).toBe(false)
  })
})
