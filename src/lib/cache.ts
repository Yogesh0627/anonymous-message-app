import { getStore } from "@/lib/store"

/**
 * Read-through cache over the pluggable store. Used by the AI coach endpoints so
 * an unchanged inbox (or an identical message) never re-runs the model.
 *
 * The cache is best-effort: a store failure falls back to computing the value
 * so a cache outage degrades to "slower", never "broken".
 */
export async function getOrCompute<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>
): Promise<T> {
  const store = getStore()

  try {
    const cached = await store.get<T>(key)
    if (cached !== null) return cached
  } catch {
    return compute()
  }

  const value = await compute()
  try {
    await store.set(key, value, ttlMs)
  } catch {
    /* non-fatal: value is still returned to the caller */
  }
  return value
}
