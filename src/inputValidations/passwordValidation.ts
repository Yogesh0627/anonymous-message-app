import { z } from "zod"

/**
 * Single source of truth for password rules used at sign-up / reset time.
 * Note: we intentionally do NOT run this complexity check at sign-in — a login
 * only needs to compare against the stored hash. Enforcing evolving rules on
 * login would lock out existing users whose passwords predate a rule change.
 */
export const passwordValidation = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(64, "Password must be at most 64 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/\d/, "Password must contain a number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain a special character")
