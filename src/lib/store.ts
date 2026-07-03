/**
 * Pluggable key-value store used by rate limiting, caching, and AI quotas.
 *
 * - When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, uses Upstash
 *   Redis over its REST API (works on edge/serverless, shared across instances).
 * - Otherwise falls back to an in-memory store — correct for a single instance
 *   and requires zero external services for local dev.
 *
 * The Upstash client is implemented with plain `fetch` (no SDK dependency) to
 * keep the install lean and the project runnable without an account.
 */

export interface KVStore {
  /** Fixed-window counter. Returns the new count and when the window resets. */
  incr(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>
  /** Current counter value without incrementing (0 if absent/expired). */
  peek(key: string): Promise<number>
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlMs: number): Promise<void>
}

class MemoryStore implements KVStore {
  private counters = new Map<string, { count: number; resetAt: number }>()
  private kv = new Map<string, { value: string; expireAt: number }>()

  async incr(key: string, windowMs: number) {
    const now = Date.now()
    const existing = this.counters.get(key)
    if (!existing || existing.resetAt <= now) {
      const entry = { count: 1, resetAt: now + windowMs }
      this.counters.set(key, entry)
      return { ...entry }
    }
    existing.count += 1
    return { count: existing.count, resetAt: existing.resetAt }
  }

  async peek(key: string): Promise<number> {
    const entry = this.counters.get(key)
    if (!entry || entry.resetAt <= Date.now()) return 0
    return entry.count
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.kv.get(key)
    if (!entry) return null
    if (entry.expireAt <= Date.now()) {
      this.kv.delete(key)
      return null
    }
    return JSON.parse(entry.value) as T
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.kv.set(key, { value: JSON.stringify(value), expireAt: Date.now() + ttlMs })
  }
}

class UpstashStore implements KVStore {
  constructor(private url: string, private token: string) {}

  private async pipeline(commands: (string | number)[][]): Promise<{ result: unknown }[]> {
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`Upstash request failed: ${res.status}`)
    return (await res.json()) as { result: unknown }[]
  }

  async incr(key: string, windowMs: number) {
    // One round trip: increment, set the TTL only if absent (NX) so the window
    // is anchored to the first hit, then read the remaining TTL.
    const [incr, , pttl] = await this.pipeline([
      ["INCR", key],
      ["PEXPIRE", key, windowMs, "NX"],
      ["PTTL", key],
    ])
    const count = Number(incr.result)
    const ttl = Number(pttl.result)
    return { count, resetAt: Date.now() + (ttl > 0 ? ttl : windowMs) }
  }

  async peek(key: string): Promise<number> {
    const [get] = await this.pipeline([["GET", key]])
    return get.result == null ? 0 : Number(get.result)
  }

  async get<T>(key: string): Promise<T | null> {
    const [get] = await this.pipeline([["GET", key]])
    if (get.result == null) return null
    return JSON.parse(get.result as string) as T
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    await this.pipeline([["SET", key, JSON.stringify(value), "PX", ttlMs]])
  }
}

let store: KVStore | null = null

export function getStore(): KVStore {
  if (store) return store
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  store = url && token ? new UpstashStore(url, token) : new MemoryStore()
  return store
}
