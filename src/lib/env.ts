import { z } from "zod"

/**
 * Validates environment variables once, at module load, so a misconfigured
 * deployment fails loudly and early instead of throwing cryptic runtime errors
 * deep inside a request handler.
 *
 * Import `env` from here instead of reading `process.env` directly.
 */
const serverEnvSchema = z.object({
  MONGOOSE_URI: z.string().min(1, "MONGOOSE_URI is required"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  // Sender address for transactional emails. Defaults to Resend's shared test
  // sender (only delivers to your own Resend account email). Point this at a
  // verified domain (e.g. noreply@yourdomain.com) to email anyone.
  EMAIL_FROM: z.string().default("onboarding@resend.dev"),
  // Optional: AI suggestions are disabled gracefully when absent.
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
})

const parsed = serverEnvSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n")
  throw new Error(`Invalid environment configuration:\n${issues}`)
}

export const env = parsed.data
