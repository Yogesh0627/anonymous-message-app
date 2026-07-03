import { NextRequest, NextResponse } from "next/server"
import { getStore } from "@/lib/store"

/**
 * Fixed-window rate limiting over the pluggable KV store (§5 of DESIGN.md).
 * In-memory for a single instance; Upstash Redis when configured, which makes
 * the limit correct across horizontally-scaled serverless instances.
 */

export type RateLimitResult = {
  success: boolean
  remaining: number
  resetAt: number
}

export async function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  const { count, resetAt } = await getStore().incr(key, windowMs)
  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  }
}

/**
 * Best-effort client identifier. Behind a proxy/CDN the real client IP is in
 * x-forwarded-for; we fall back to a constant so the limiter still degrades to
 * a global cap rather than failing open entirely.
 */
export function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return request.headers.get("x-real-ip") ?? "anonymous"
}

/** Returns a 429 response when the limit is exceeded, otherwise null. */
export async function enforceRateLimit(
  request: NextRequest,
  scope: string,
  opts: { limit: number; windowMs: number }
): Promise<NextResponse | null> {
  const key = `ratelimit:${scope}:${getClientId(request)}`
  const result = await checkRateLimit(key, opts)
  if (result.success) return null

  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
  return NextResponse.json(
    { success: false, message: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  )
}
