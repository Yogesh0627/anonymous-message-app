# Design Doc — AI Feedback Assist & Scale Infrastructure

**Status:** Proposed
**Author:** Yogesh Chauhan
**Scope:** Two user-facing AI features (a sender-side feedback composer and a
receiver-side feedback coach) built on top of a shared "AI at scale" layer
(pluggable rate limiting, response caching, and per-user cost quotas).

---

## 1. Problem & goals

Candor is an anonymous feedback platform. Two friction points:

1. **Senders freeze up.** Writing honest-but-kind feedback is hard. People
   either send something vague ("nice work") or something harsh.
2. **Receivers don't know what to do with feedback.** A pile of anonymous
   comments is not the same as a plan to improve.

### Goals
- Help senders turn rough thoughts (typed **or spoken**) into clear, civil
  feedback — without writing it *for* them.
- Help receivers turn their inbox into **themes + an actionable growth plan**.
- Do this at controlled cost: every model call is rate-limited, cached where
  possible, and counted against a per-user quota.

### Non-goals
- We do **not** auto-generate feedback from nothing. AI polishes the user's own
  input; it never invents opinions. (See §3.1 — authenticity guardrail.)
- We do not store raw audio. Speech is transcribed client-side and discarded.
- No real-time collaboration on drafts. One user, one draft.

---

## 2. Architecture overview

```
                          ┌─────────────────────────────────────────┐
  Sender (/user/:name) ──▶│ POST /api/compose-feedback               │
   ├ Web Speech API ──┐   │  → rateLimit(ai) → quota → Gemini rewrite│
   ├ tone / intent    │   │  → returns polished draft (streamed)     │
   └ char-limit target┘   └─────────────────────────────────────────┘
                                         │ (user edits, then sends)
                                         ▼
                          POST /api/send-message (existing: moderation + rateLimit)

  Receiver (/dashboard) ─▶┌─────────────────────────────────────────┐
   ├ "Coach my inbox" ───▶│ POST /api/coach/inbox                    │
   │                      │  → cache(inboxVersion) → Gemini analyze  │
   │                      │  → {themes[], growthPlan[], sentiment}   │
   └ per-message "act" ──▶│ POST /api/coach/message                  │
                          │  → cache(contentHash) → Gemini advise    │
                          └─────────────────────────────────────────┘

  Shared infra:  lib/store.ts (Redis | in-memory)
                 lib/rateLimit.ts (async, pluggable store)
                 lib/cache.ts  (get/set JSON w/ TTL)
                 lib/quota.ts  (per-user daily AI-call budget)
```

Everything AI-related sits behind three shared primitives so the two features
(and the existing `suggest-messages` / `moderation`) all share one cost-control
story.

---

## 3. Feature 1 — AI Feedback Composer (sender)

### 3.1 UX flow
On `/user/[username]`, next to the message box, an **"Compose with AI"** panel:

1. **Rough thoughts** textarea. User types, or clicks 🎤 **Record** to dictate
   (Web Speech API transcribes live into the same box).
2. **Tone** chips: `Constructive · Warm · Direct · Playful · Formal`.
3. **Intent** chips: `Praise · Concern · Suggestion · Appreciation`.
4. **Length** slider: target characters, bounded `[40, 300]` (300 = existing
   server max in `messageSchema`).
5. **Generate** → streams a polished draft into the main message box.
6. User **edits freely**, then sends through the normal (moderated) path.

**Authenticity guardrail (the important product decision):** the prompt is
explicitly instructed to *rephrase and structure the user's own points only* —
"if the input is empty or has no substance, ask the user for their thoughts
rather than inventing feedback." This keeps feedback real and is the thing to
talk about in an interview.

### 3.2 Speech-to-text — Web Speech API
- Uses the browser `SpeechRecognition` API. **Zero backend, zero cost, no audio
  stored.** Interim results stream into the textarea; final results are appended.
- **Capability-gated:** if `window.SpeechRecognition`/`webkitSpeechRecognition`
  is absent (Safari/Firefox), the 🎤 button is hidden and we show "Type your
  thoughts" — graceful degradation, no broken UI.
- Encapsulated in a `useSpeechToText()` hook (start/stop/transcript/supported).

### 3.3 API contract
```
POST /api/compose-feedback
body: {
  rawThoughts: string (1..1000),
  tone: 'constructive'|'warm'|'direct'|'playful'|'formal',
  intent: 'praise'|'concern'|'suggestion'|'appreciation',
  maxChars: number (40..300)
}
→ 200 text/event-stream  (streamed polished draft via Vercel AI SDK)
→ 400 invalid input | 429 rate-limited | 402 quota exceeded | 503 AI off
```
- **Rate limit:** 10 / 5 min / client (AI scope).
- **Quota:** counts against the per-user/-client daily AI budget (§5.3).
- Not moderated here (it's a draft); the eventual **send** is still moderated.

---

## 4. Feature 2 — AI Feedback Coach (receiver)

### 4.1 Aggregate inbox analysis (headline)
"**Coach my inbox**" button on the dashboard →

```
POST /api/coach/inbox   (auth required)
→ {
    summary: string,
    sentiment: { positive: n, neutral: n, negative: n },   // counts
    themes: [{ label, count, examples: string[] }],
    growthPlan: [{ title, why, firstStep }]
  }
```
- Reads the user's messages, sends them to Gemini `generateObject` with a schema.
- **Cached** in Redis keyed by `coach:inbox:{userId}:{inboxVersion}` where
  `inboxVersion = messageCount + lastMessageId`. New message → key changes →
  fresh analysis; otherwise served from cache (TTL 24h). This is the caching
  story: we never re-run the model for an unchanged inbox.

### 4.2 Per-message advice
```
POST /api/coach/message   (auth required)
body: { messageId }
→ { actionable: boolean, summary, steps: string[], tone: 'kind'|'harsh'|'neutral' }
```
- Cached by `coach:msg:{sha256(content)}` (content-addressed → identical text
  reuses the result across users). TTL 7d.

---

## 5. Shared infra — "AI at scale" layer

This is the theme. All of it degrades to a working local setup with **no
external accounts**, and upgrades to Redis when env vars are present.

### 5.1 Pluggable store — `lib/store.ts`
A tiny interface so rate limiting + caching don't care about the backend:
```ts
interface KVStore {
  incr(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>
  peek(key: string): Promise<number>
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlMs: number): Promise<void>
  incrBy(key: string, amount: number, ttlMs: number): Promise<number>
}
```
- **UpstashStore** when `UPSTASH_REDIS_REST_URL` + `_TOKEN` are set.
- **MemoryStore** fallback (current behavior) otherwise.
- Selected once at module load; call sites are unchanged.
- `incrBy` exists so callers never do a read-modify-write (`get` → add → `set`),
  which loses updates under concurrency. It maps to Redis `INCRBY` and to a single
  synchronous read-and-write in `MemoryStore`. `grantAiBonus` depends on it: two
  redemptions racing must not let one clobber the other's bonus.

### 5.2 `lib/rateLimit.ts` — becomes async
Refactor the existing sync limiter to `await store.incr(...)`. `enforceRateLimit`
becomes `async`; the ~5 call sites already `await` in async handlers, so the
change is mechanical. Existing unit tests updated to the async API + a MemoryStore.

### 5.3 `lib/quota.ts` — per-user AI budget
- `DAILY_AI_CALLS` (default 50) per user/client, tracked via `store.incr` on a
  `quota:{id}:{YYYY-MM-DD}` key with a 24h window.
- Returns **402** with a friendly "daily AI limit reached" message when exceeded.
- Prevents a single user from running up the Gemini bill — the concrete cost
  story.

### 5.4 `lib/cache.ts`
Thin `getOrCompute(key, ttl, fn)` wrapper over the store used by both coach
endpoints.

---

## 6. Data model changes
- **None required** on `User`. Message subdocuments already carry `_id`,
  `content`, `createdAt` — enough for content hashing and inbox versioning.
- All AI state (rate counters, quotas, cached analyses) lives in the KV store,
  **not** MongoDB. Keeps the model clean and the cache disposable.

---

## 7. Rate-limit & cost summary

| Endpoint                 | Limit (per client)   | Quota-counted | Cached        |
| ------------------------ | -------------------- | ------------- | ------------- |
| compose-feedback         | 10 / 5 min           | yes           | no            |
| coach/inbox              | 5 / 5 min            | yes           | yes (24h)     |
| coach/message            | 20 / 5 min           | yes           | yes (7d)      |
| send-message (existing)  | 5 / min              | no            | no            |
| suggest-messages (exist) | fold into AI limiter | yes           | no            |

---

## 8. Tradeoffs & alternatives considered
- **Web Speech API vs. server transcription (Gemini/Whisper):** chose browser
  API for zero cost / zero audio storage / privacy; accepted the Safari/Firefox
  gap, mitigated by a typed fallback. Documented as a known limitation.
- **AI ghostwriting vs. polishing:** chose polish-only to protect the
  authenticity that makes feedback valuable. This is a product stance, not a
  technical limit.
- **Cache in Redis vs. Mongo:** Redis (or in-memory) — cache is disposable and
  hot; putting it in Mongo would pollute the domain model and add write load.
- **Content-addressed message cache:** identical feedback text reuses advice
  across users — cheap win, and a nice thing to explain.

## 9. Failure modes (all fail safe)
- No Gemini key → composer/coach return **503** with a clear message; core app
  (send/receive) fully works.
- No Redis → in-memory store; correct on a single instance, documented as the
  multi-instance upgrade path.
- Model/network error → 500 with retry-friendly copy; never blocks messaging.
- Speech unsupported → hidden mic, typed input still works.

## 10. Rollout phases
1. **Infra**: `store.ts`, async `rateLimit.ts` (+ tests), `quota.ts`, `cache.ts`.
2. **Composer**: `useSpeechToText` hook, `/api/compose-feedback`, panel UI.
3. **Coach**: `/api/coach/inbox` + dashboard section, `/api/coach/message` + button.
4. **Tests**: unit (quota/cache/limiter), E2E smoke (composer panel renders,
   mic gated, coach button visible).

## 11. New environment variables
```
# Optional — enables Redis-backed rate limiting, caching, and quotas.
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
# Optional tuning
DAILY_AI_CALLS=50
```
All optional: absent → in-memory fallback, app still runs.

---

# Part 2 — Growth Loop & Credit Economy

Turns one-shot feedback into a **feedback → growth → measured-change** loop, with
a credit economy that funds AI usage.

## 12. Sender identity model (hybrid)
Decision: **keep "anyone can send," add identity on top** — a strict superset of
today's behavior, no regression.

| Sender state | Can send? | `senderId` stored | Earns credits | Can be looped back |
| ------------ | --------- | ----------------- | ------------- | ------------------ |
| Logged out   | yes       | `null`            | no            | no                 |
| Logged in    | yes       | their user id     | yes (+30)     | yes                |

- `send-message` reads the session (if any). If present **and the sender is not
  the recipient**, it stamps `senderId`. `senderId` is **never** returned to the
  recipient — anonymity to the receiver is preserved; attribution exists only in
  the system for crediting + follow-up.
- **Self-feedback is blocked from earning** (`senderId === recipientId` → no
  credit, and we reject to avoid farming). This is the first anti-abuse gate.

### Data model change
`Message` subdocument gains `senderId?: ObjectId` (optional, default unset,
excluded from all recipient-facing responses via projection).

## 13. Growth plan lifecycle
A growth plan is generated by the **coach** (§4.1) from the receiver's inbox.
The receiver can **accept** it, turning suggestions into trackable tasks.

```
suggested ──accept──▶ active ──all tasks done / 21-day streak──▶ completed
    │                    │
    └──dismiss──▶ archived└──abandon / 14d inactive──▶ archived
```

### `GrowthPlan` collection
```
{
  _id, userId,
  sourceMessageIds: ObjectId[],     // which feedback inspired it
  title, summary,
  tasks: [{ id, title, done: bool, doneAt }],
  status: 'suggested'|'active'|'completed'|'archived',
  createdAt, acceptedAt, completedAt
}
```
- Accepting a plan → **+5 credits** (once, idempotent on plan id).

## 14. Daily check-ins ("does it change?")
While a plan is `active`, the user logs a daily check-in: a short note + a **mood
/ self-rating (1–5)**. This is what makes "change" *measurable* — the self-rating
series becomes a line chart on the dashboard (reuses the analytics chart system).

### `CheckIn` collection
```
{ _id, userId, growthPlanId, date: 'YYYY-MM-DD', note, mood: 1..5, createdAt }
```
- **Unique index** on `(growthPlanId, date)` → one check-in per plan per day,
  which *also* enforces the "+10/day" credit can't be farmed.
- Requires a substantive note (min length) to earn — empty check-ins earn nothing.
- Completing a check-in → **+10 credits**, and increments a streak counter.

## 15. Loop-back confirmation ("did you notice a change?")
When a plan reaches `completed` (or on a manual "share progress" action), for
each `sourceMessageId` whose `senderId` is a real logged-in user, we create a
confirmation request.

### `ChangeConfirmation` collection
```
{
  _id, messageId, growthPlanId,
  senderId, receiverId,
  status: 'pending'|'confirmed'|'declined',
  requestedAt, respondedAt
}
```
- The **sender** sees "Someone acted on feedback you gave — do you notice a
  change?" in a new "Feedback I gave" area. On **confirm**:
  - receiver **+20**, sender **+10** (both idempotent on confirmation id).
- Sender identity is still never revealed to the receiver; the receiver only
  sees "1 of your senders confirmed a change."

## 16. Credit ledger (source of truth)
Credits are **append-only ledger entries**; `User.credits` is a denormalized
balance for fast reads. The ledger is the truth and is auditable.

### `CreditEntry` collection
```
{ _id, userId, delta: number, reason, refType, refId, createdAt }
```
- **Idempotency:** unique index on `(userId, reason, refId)`. The same event
  (e.g., accepting plan X) can never double-credit — critical for a system where
  network retries and double-clicks are common.
- Balance mutation is: insert entry (dup-key → no-op) **then** `$inc User.credits`
  only if the insert was new.

### Earn table
| Action                          | Credits | Guardrails                                             |
| ------------------------------- | ------- | ------------------------------------------------------ |
| Give feedback (logged-in)       | +30     | not self; max 5 credited sends/day; must pass moderation |
| Receive feedback                | +20     | one per message; sender ≠ receiver                     |
| Accept a growth plan            | +5      | once per plan                                          |
| Daily check-in                  | +10     | one/day/plan; substantive note required                |
| Sender confirms a change        | +20 recv / +10 sender | once per confirmation                    |

### Anti-abuse summary (the "safety at scale" story)
- Self-feedback earns nothing (id check).
- Per-action **daily caps** (e.g., give-feedback capped at 5/day → 150 credits).
- **Idempotent ledger** kills double-credit from retries/click-spam.
- Unique indexes enforce "once per day / once per plan / once per message."
- All earn events pass through the shared **rate limiter** (§5.2).
- Diminishing returns option: Nth credited action/day worth less (config).

## 17. Redemption → AI quota (closing the loop)
Credits are **spendable on AI usage**, wiring the economy into §5.3 quota:
```
POST /api/credits/redeem  body: { bundle: 'ai_calls_10' }
→ debits credits (ledger -delta), grants a quota bonus for today
```
- Example price: `5 credits = +1 AI call today`; bundles for convenience.
- `quota.ts` effective budget = `DAILY_AI_CALLS + redeemedBonusToday`.
- Redemption is a ledger debit (idempotent per bundle purchase id), so balance
  and quota stay consistent.

## 18. New endpoints (Part 2)
```
POST /api/growth/accept        { planId }                  → +5, plan active
GET  /api/growth/plans                                     → user's plans
POST /api/growth/checkin       { planId, note, mood }      → +10/day
POST /api/growth/complete      { planId }                  → status, spawn confirmations
GET  /api/feedback-given                                   → sender's confirmation requests
POST /api/confirmations/:id    { decision }                → +20/+10 on confirm
GET  /api/credits              → { balance, recentEntries }
POST /api/credits/redeem       { bundle }                  → quota bonus
```
All authenticated; all mutating-credit routes go through the idempotent ledger.

## 19. Data-model summary (Part 2)
- **New collections:** `GrowthPlan`, `CheckIn`, `ChangeConfirmation`, `CreditEntry`.
- **User** gains: `credits: number` (denormalized balance).
- **Message** gains: `senderId?: ObjectId` (hidden from recipient responses).
- Credits/quota counters that are ephemeral (daily quota bonus) live in the **KV
  store**; anything auditable (the ledger, plans, check-ins) lives in **Mongo**.

## 20. Build phases (Part 2)
5. Ledger core (`CreditEntry` + idempotent `award()/spend()` helper + tests).
6. Sender attribution + self-feedback block + give/receive credits.
7. Growth plans: accept → tasks → daily check-ins (+ self-rating chart).
8. Loop-back confirmations + sender's "Feedback I gave" view.
9. Redemption → AI quota; credits/leaderboard UI.

## 21. Interview talking points this unlocks
- **Idempotent, append-only ledger** with denormalized balance — real
  distributed-systems hygiene (exactly-once crediting under retries).
- **Abuse modeling** on an anonymous + gamified surface.
- **A closed economic loop** (earn ↔ spend on metered AI) — product + infra.
- **Measurable behavior change** via self-rating time series — real analytics.
