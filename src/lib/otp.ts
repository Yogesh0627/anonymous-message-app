import { randomInt } from 'crypto'
import bcrypt from 'bcryptjs'

/**
 * One-time codes for email verification and password reset.
 *
 * Three properties this module exists to guarantee:
 *
 * 1. **Unguessable.** Codes come from `crypto.randomInt`, a CSPRNG. `Math.random`
 *    is seeded predictably and must never generate a security token.
 * 2. **Not readable at rest.** Codes are bcrypt-hashed before they touch the
 *    database, exactly like passwords. A database leak hands over hashes, not
 *    live reset codes.
 * 3. **Constant-time comparison.** `bcrypt.compare` does not short-circuit on the
 *    first differing byte, so it leaks no timing signal about a partial match.
 *
 * Codes are single-use: callers must clear the stored hash once consumed.
 */

/** 6-digit numeric code, cryptographically random, zero-padded. */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

/** Hashes a code for storage. Never store the plaintext. */
export async function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, 10)
}

/**
 * Constant-time check of a supplied code against the stored hash.
 * Returns false for empty input or a malformed/absent hash — which is what
 * makes an already-consumed code (cleared to '') impossible to replay.
 */
export async function verifyOtp(code: string, hash: string | undefined | null): Promise<boolean> {
  if (!code || !hash) return false
  try {
    return await bcrypt.compare(code, hash)
  } catch {
    // Malformed hash (e.g. a legacy plaintext value) never validates.
    return false
  }
}

/** True when the expiry timestamp is in the future. Absent/invalid dates are expired. */
export function isOtpUnexpired(expiry: Date | undefined | null): boolean {
  if (!expiry) return false
  const time = new Date(expiry).getTime()
  return Number.isFinite(time) && time > Date.now()
}
