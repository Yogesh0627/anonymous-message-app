# Candor — Architecture & Module Guide

> My engineering notes on how Candor is built: the request lifecycle, a
> module-by-module map, the core flows end to end, and **why each dependency is
> in the project.** Written so I (or anyone) can pick the codebase back up months
> later. For the deep-dive on the AI features specifically, see [`DESIGN.md`](DESIGN.md).

— Yogesh Chauhan

---

## TL;DR — for a human or an AI reading this cold

**What it is:** Candor is a full-stack web app — an **anonymous-feedback platform**
where feedback becomes a **trackable, AI-coached growth loop**. Built with Next.js
14 (App Router), TypeScript, MongoDB/Mongoose, NextAuth, and Google Gemini,
deployable to Vercel.

**What it does:**
- Every user gets a public link (`/user/:username`); anyone can send them **honest
  anonymous feedback** without revealing their identity.
- Incoming messages are **AI-moderated** (Gemini) before they reach the inbox.
- The inbox updates **in real time** (Server-Sent Events over MongoDB change streams).
- An **AI coach** clusters the inbox into themes and drafts a **growth plan** the
  user tracks on a board (To Do → In Progress → Completed), with check-ins.
- A **credit ledger** rewards giving/acting on feedback; credits buy AI calls,
  which are **rate-limited, cached, and quota-capped** to control cost.
- An **admin console** manages users, a moderation queue, the roadmap, app
  settings, and an audit log.

**How it's shaped (the mental model):** the **API layer is the source of truth** —
client components are thin, and every rule (validation, auth, rate limits, credits)
is enforced server-side. **Business logic lives in `lib/`** (framework-free,
unit-tested), route handlers just do HTTP. **Everything expensive is guarded**
(AI = rate-limit→cache→quota; credits = idempotent ledger; config = validated at boot).

**Current state:** feature-complete and green (typecheck + unit tests pass, CI
configured). **Not yet deployed**; secrets need rotating before going public; E2E is
smoke-level. See [§7 Current status & roadmap](#7-where-its-going--current-status--roadmap).

**Where to look first:** this file (`ARCHITECTURE.md`) for the whole system,
[`DESIGN.md`](DESIGN.md) for the AI internals, [`DEPLOYMENT.md`](DEPLOYMENT.md) to
ship it

---

## 1. The 10,000-ft view

Candor is an anonymous-feedback platform where feedback becomes a **trackable,
AI-coached growth loop**. I built it on the **Next.js 14 App Router** so the same
codebase serves the marketing page, the authenticated app, the admin console, and
the API — with React Server Components for the shell and client components only
where I need interactivity.

```
Browser
  │
  ├─ (marketing)  /            landing, public feedback page /user/:name
  ├─ (auth)       /sign-in …   sign-up · verify · sign-in · forgot-password
  ├─ (app)        /dashboard … dashboard · coach · feedback · profile · help · roadmap
  ├─ (admin)      /admin        users · moderation · roadmap · settings · audit · stats
  │
  └─ /api/*  ── route handlers ──► Mongoose ──► MongoDB Atlas (replica set)
                     │
                     └──► lib/store (Upstash Redis | in-memory) for rate-limit / cache / quota
                     └──► Google Gemini (Vercel AI SDK) for moderation, coach, composer
                     └──► Resend for transactional email
```

Two design principles drive most decisions:

1. **The API layer is the source of truth.** Client components are thin; every
   rule (validation, auth, rate limits, credits) is enforced server-side in a
   route handler. The public feedback page, for example, is just a form — the
   `send-message` route is the authority on who exists and what's allowed.
2. **Everything expensive is guarded.** Every AI call passes through rate limit →
   cache → per-user quota. Every credit mutation is idempotent. The app fails
   fast on bad config (env is validated at boot).

---

## 2. Module map

```
src/
├── app/
│   ├── (app)/              # authenticated shell (Sidebar + Topbar + Footer + AppGuard)
│   │   ├── dashboard/      # overview: credits, growth progress, inbox analytics
│   │   ├── coach/          # AI coach + growth board (To Do / In Progress / Completed)
│   │   ├── feedback/       # real-time inbox (sort, paginate, SSE live updates)
│   │   ├── profile/        # public link, stats, username editor
│   │   ├── help/ roadmap/  # static-ish content, roadmap is DB-driven
│   ├── (auth)/             # sign-up, verify, sign-in, forgot-password
│   ├── admin/              # admin console (role-gated)
│   ├── user/[username]/    # PUBLIC anonymous feedback page
│   ├── api/                # all route handlers (see §3)
│   ├── layout.tsx          # root: ThemeProvider → AuthProvider → TooltipProvider
│   ├── opengraph-image.tsx # auto-generated social card
│   ├── robots.ts sitemap.ts# SEO
│   └── page.tsx            # landing + JSON-LD
│
├── components/             # Sidebar, Topbar, Footer, ThemeToggle, coach widgets,
│   └── ui/                 # shadcn/ui primitives (button, dialog, tooltip, …)
│
├── lib/                    # the "brains" — framework-free, unit-testable
│   ├── store.ts            # KVStore interface: Upstash (REST) or in-memory
│   ├── rateLimit.ts        # sliding-window limiter over the store
│   ├── cache.ts            # JSON get/set with TTL over the store
│   ├── quota.ts            # per-user daily AI-call budget
│   ├── credits.ts          # idempotent credit ledger (award / spend / balance)
│   ├── creditRules.ts      # credit amounts, reasons, redeem bundles
│   ├── coach.ts            # inbox → themes + growth plan (Gemini, structured)
│   ├── moderation.ts       # screen incoming messages (Gemini)
│   ├── usernameGenerator.ts# cool default names (animal/fruit/veg/anime)
│   ├── admin.ts audit.ts   # admin helpers + audit logging
│   ├── featureGuards.ts    # maintenance / registration flags
│   ├── env.ts              # Zod-validated environment
│   └── resend.ts utils.ts  # email client, cn() helper
│
├── models/                 # Mongoose schemas (see §4)
├── inputValidations/       # Zod schemas shared client ↔ server
├── dbConfig/db.ts          # cached Mongoose connection (+ optional DNS override)
├── context/AuthProvider    # next-auth SessionProvider wrapper
└── middleware.ts           # route protection (redirects by auth state)
```

The key structural choice: **business logic lives in `lib/`, not in route
handlers.** Route handlers do HTTP concerns (parse, authorize, respond); they call
`lib/` functions that are pure enough to unit-test without spinning up Next. That's
why `creditRules`, `rateLimit`, and the store have real Vitest tests.

---

## 3. Core flows, end to end

### 3.1 Auth
- **Email/password:** `sign-up` (rate-limited, feature-flag-aware) hashes the
  password with **bcrypt**, stores a 6-digit code, and emails it via **Resend**.
  `verify` checks the code; `sign-in` uses NextAuth's Credentials provider.
- **Google OAuth:** the `signIn` callback creates-or-links a `User` doc, assigns a
  **cool auto-generated username**, marks it verified, and blocks banned accounts.
- **Sessions are JWT** (no server session store needed → fits serverless). The
  `jwt`/`session` callbacks carry `_id`, `username`, `role`, `isVerified`. A
  `trigger === 'update'` branch lets the client refresh the token after a username
  change without re-login.
- **Route protection** is in `middleware.ts`: unauthenticated users are bounced
  from app routes; authenticated users are bounced from auth pages; admin routes
  additionally check `role`.

### 3.2 Sending anonymous feedback (public)
`/user/:username` renders a form (optionally an AI **composer**). On submit →
`POST /api/send-message`:
1. **Rate limit** (5/min per client) via the store.
2. **Maintenance guard** (admin flag).
3. **Zod** validation of `{ username, content }`.
4. **Resolve recipient** by current *or* previously-held username (so links shared
   before a rename still land).
5. **AI moderation** (Gemini) — abusive content is flagged into
   `flaggedMessage` instead of the inbox.
6. Persist the message; if the sender is logged in, **award credits** (idempotent).

### 3.3 Real-time inbox (SSE + change streams)
The inbox opens an **EventSource** to `GET /api/stream-messages`. That handler
opens a **MongoDB change stream** filtered to the user's messages and pushes each
insert down the SSE connection. I chose SSE over WebSockets because the data is
**one-directional** (server → client) and SSE rides plain HTTP — no extra protocol,
auto-reconnect built in, trivial on serverless. Change streams are why the DB must
be a **replica set** (Atlas M0 satisfies this). The cleanup path is careful:
closing a change stream can return `void` or a promise, and double-cleanup must be
a no-op — an early version crashed here, so the teardown is defensive.

### 3.4 The AI growth loop
- **Compose (sender):** `compose-feedback` rewrites the sender's own rough input
  (typed or spoken via the Web Speech API) into clear, civil feedback. It never
  invents opinions — authenticity guardrail.
- **Coach (receiver):** `coach/inbox` clusters up to 50 messages over a chosen
  window into **themes + a growth plan** using Gemini **structured output**
  (`generateObject` + a Zod schema, so I get typed data, not a blob of text).
- **Growth board:** accepted plan tasks flow To Do → In Progress → Completed,
  each mapped back to the feedback that inspired it; **check-ins** log progress.
- All of this sits on the shared **rate-limit → cache → quota** layer (see
  DESIGN.md). Cache keys are content/inbox-version based, so re-coaching an
  unchanged inbox is free.

### 3.5 Credits & quota
- `credits.ts` is an **append-only ledger**: every award/spend is a `creditEntry`
  row. A **unique index on `(userId, reason, refId)`** makes writes idempotent —
  retries or races can't double-count. Balance = sum of deltas.
- `quota.ts` gives each user a **daily AI-call budget** (default 50) tracked in the
  store; redeeming credit bundles tops it up. AI features degrade gracefully when
  the budget is spent.

### 3.6 Admin
Role-gated console: user management (search / roles / ban), a **moderation queue**
of flagged messages, a DB-driven **roadmap editor**, **app settings**
(maintenance / registration flags read by `featureGuards`), and an **audit log**
of admin actions.

### 3.7 Username system
- **Cool defaults** for auto-assigned (Google) accounts via `usernameGenerator`.
- **Non-destructive renames:** old names are pushed to `previousUsernames`
  (reserved so no one else can claim them) and still resolve in `send-message`.
- **Rolling cap:** ≤ 3 changes per 365 days (admins exempt), tracked as timestamps
  and surfaced in the UI as "N of 3 left this year".

---

## 4. Data models (`src/models`)

| Model | Purpose | Notable design |
| ----- | ------- | -------------- |
| `user` | account, messages subdoc, username history + change log | `previousUsernames` indexed for old-link resolution |
| `creditEntry` | one row per credit award/spend | **unique `(userId, reason, refId)`** → idempotency |
| `growthPlan` | AI-generated plan, tasks, source-feedback mapping | drives the growth board |
| `checkIn` | progress check-ins against a plan | powers streaks/mood |
| `flaggedMessage` | moderation-blocked messages | feeds the admin queue |
| `roadmapItem` | public roadmap entries | editable by admins |
| `appSettings` | maintenance / registration flags | single settings doc |
| `auditLog` | admin action trail | accountability |
| `changeConfirmation` | loop-back confirmation of acted-on feedback | closes the feedback loop |

---

## 5. Why each dependency (package rationale)

I try to justify every dependency — fewer packages, less to audit and update.

### Framework & language
| Package | Why it's here |
| ------- | ------------- |
| `next` (14, App Router) | RSC + route handlers + middleware in one framework; deploys to serverless cleanly |
| `react` / `react-dom` | UI |
| `typescript` | Types across the client/server boundary — the shared Zod + TS story is the backbone |

### Data & backend
| Package | Why |
| ------- | --- |
| `mongoose` | Schema/ODM over MongoDB; change streams power the real-time inbox |
| `zod` | **One** validation library used on both client forms and API routes — single source of truth for shapes |
| `@hookform/resolvers` + `react-hook-form` | Ergonomic forms with Zod validation, minimal re-renders |

### Auth & security
| Package | Why |
| ------- | --- |
| `next-auth` | Credentials + Google OAuth with JWT sessions; callbacks give me full control over the token |
| `bcryptjs` | Password hashing (pure-JS, no native build headaches on serverless) |
| `jsonwebtoken` | Signing short-lived tokens where I need them outside NextAuth's own session JWT |

### AI
| Package | Why |
| ------- | --- |
| `ai` (Vercel AI SDK) | Provider-agnostic streaming + `generateObject` for **typed** structured output |
| `@ai-sdk/google` | Google **Gemini** provider (`gemini-2.5-flash`) — capable and has a usable free tier |

### Email
| Package | Why |
| ------- | --- |
| `resend` | Simple, modern transactional email API |
| `@react-email/*` + `react-email` | Author email templates as React components instead of raw HTML strings |

### UI & styling
| Package | Why |
| ------- | --- |
| `tailwindcss` | Utility-first styling; the whole theme is CSS-variable tokens (light/dark from one source) |
| `@radix-ui/*` | Accessible, unstyled primitives under **shadcn/ui** (dialogs, tooltips, selects, switch, toast) |
| `class-variance-authority` + `clsx` + `tailwind-merge` | The shadcn styling toolkit — variants + the `cn()` class merger |
| `tailwindcss-animate` | Animations for the Radix primitives |
| `next-themes` | Light / dark / system theme with no flash |
| `lucide-react` | Icon set |
| `embla-carousel-react` + `-autoplay` | The landing-page message carousel |
| `input-otp` | The 6-digit verification code input |
| `usehooks-ts` | Small typed hooks (debounce for the live username check, etc.) |
| `dayjs` | Lightweight date formatting/aggregation |
| `axios` | Client HTTP with interceptable errors |

### Testing & tooling — *why Vitest and Playwright specifically*
| Package | Why |
| ------- | --- |
| `vitest` | **Unit tests** for the framework-free `lib/` logic (credit rules, rate limiter, store). I picked it over Jest because it's ESM-native, Vite-fast, and needs almost no config for a TS + path-alias project |
| `vite-tsconfig-paths` | Lets Vitest resolve the same `@/…` path aliases the app uses |
| `@playwright/test` | **End-to-end smoke tests** in a real browser — the parts unit tests can't cover (the actual sign-up → verify → message journey). Real Chromium catches routing/hydration/redirect bugs a jsdom test would miss |
| `eslint` + `eslint-config-next` | Linting with Next's recommended rules |
| `postcss` | Tailwind's build pipeline |

The split is deliberate: **Vitest for pure logic, Playwright for user journeys.**
Both run in CI (`.github/workflows/ci.yml`: lint → typecheck → test → build, plus a
Playwright job) on every push and PR.

---

## 6. Cross-cutting concerns

- **Validation:** every API route parses input with a Zod schema from
  `inputValidations/`; the same schemas back the client forms.
- **Rate limiting:** messaging, sign-up, and OTP endpoints go through
  `rateLimit.ts` — including the password-reset `POST`, which is the endpoint that
  actually consumes the code. The limiter is backed by the pluggable store, so scaling to
  multiple instances is a config change (add Upstash), not a code change.
- **One-time codes:** `otp.ts` is the single source of truth for email-verification
  and password-reset codes — CSPRNG generation, bcrypt hashing at rest, constant-time
  comparison, and single-use semantics (the stored hash and its expiry are both burned
  on consumption, so a cleared code cannot be replayed).
- **Atomicity:** credit awards are idempotent on a unique `(userId, reason, refId)`
  index; the daily AI-quota bonus is granted with an atomic `incrBy` rather than a
  read-modify-write, so concurrent redemptions cannot lose an update.
- **Config safety:** `env.ts` validates all environment variables at startup — a
  misconfigured deploy fails immediately with a clear message instead of at
  request time.
- **Accessibility:** Radix primitives supply roles and keyboard handling for the
  select/tooltip/dialog components. Hand-rolled overlays (the onboarding tour, the
  mobile nav drawer) use `hooks/useModalA11y.ts` for Escape-to-close, focus trapping,
  focus restoration, and scroll lock. A closed drawer is `invisible`, not merely
  translated off-screen, so its links leave the tab order.
- **Theming & SEO:** one CSS-variable token system (incl. a `brand` token) drives
  light/dark; SEO ships `sitemap.ts`, `robots.ts`, JSON-LD, and an auto-generated
  OG image.

---

## 7. Where it's going — current status & roadmap

### 7.1 Current status (what's done vs. pending)

**Built and working:**
- Email/password + Google OAuth auth, email verification & password reset (Resend)
- Real-time inbox (SSE + change streams), inbox analytics, accept-messages toggle
- AI moderation, AI coach (themes + growth plan), sender-side AI composer
- Idempotent credit ledger + per-user AI quota + redeemable bundles
- Admin console (users, moderation, roadmap, settings, audit log)
- Username system: cool auto-names, reserved history, non-destructive renames, rolling cap
- Dark/light/system theming on a single token system, shadcn tooltips
- SEO (metadata, `sitemap.ts`, `robots.ts`, JSON-LD, auto OG image)
- Unit tests (Vitest) + smoke E2E (Playwright) + GitHub Actions CI

**Pending / known gaps (deliberately tracked, not hidden):**
- **Not yet deployed** — needs a Vercel deploy; `NEXTAUTH_URL` / `NEXT_PUBLIC_SITE_URL`
  and the Google OAuth redirect URI must be set to the live domain (see DEPLOYMENT.md).
- **Secrets must be rotated** before the repo/app goes public.
- **E2E is smoke-level** — the full verify → message → coach journey isn't covered yet.
- **SSE is single-instance** — the change-stream fan-out needs a shared pub/sub to
  scale horizontally.
- **Upstash is optional** — locally it falls back to an in-memory store, so rate
  limits/quota aren't shared across instances until Upstash is enabled in prod.

### 7.2 Near-term (make it production-real)
1. Deploy to Vercel + point env at the live domain; add screenshots + live URL to the README.
2. Turn **Upstash on in production** so rate limits and quotas are shared (config-only change —
   the call sites already use the `KVStore` interface).
3. Deepen E2E to the full auth → message → coach loop against a seeded test DB.

### 7.3 Mid-term (scale & breadth)
- Put the SSE fan-out behind **shared pub/sub** (Redis / Ably) so real-time survives
  multiple serverless instances.
- Move **moderation & coaching to a background queue** so the request path stays fast.
- **GitHub OAuth** and a **PWA / installable** shell (both already listed on the in-app roadmap).

### 7.4 Long-term / product direction
- The live product roadmap is **DB-driven at `/roadmap`** and editable by admins —
  that's the canonical "what's next" for shipped features.
- A possible pivot explored in notes: extend the anonymous-feedback + reputation
  engine into a **guest/host reputation system** (e.g. homestays) — same core loop
  (identity-light feedback → trust signal → action), different domain. Parked as a
  "later version" idea, not committed.

> **For an AI agent picking this up:** treat §7.1 as ground truth for what exists.
> New feature work should follow the layering in §2 (logic in `lib/`, HTTP in route
> handlers, shapes in `inputValidations/`), and anything expensive must go through
> the guards in §6.

---

## 8. Orientation — running it & where to make changes

**Run locally:**
```bash
npm install                 # .npmrc sets legacy-peer-deps for the react-email/ai stack
cp .env.example .env         # fill in MONGOOSE_URI, NEXTAUTH_SECRET, RESEND_API_KEY (see env.ts)
npm run dev                  # http://localhost:3000
npm test                     # Vitest unit tests
npm run seed:roadmap|guest|feedback   # optional demo data
```

**Where to make a change (by intent):**
| I want to… | Go to |
| ---------- | ----- |
| Add/adjust an API endpoint | `src/app/api/<name>/route.ts` (call into `lib/`) |
| Change a business rule (credits, quota, coach) | `src/lib/*` (has unit tests) |
| Add/adjust a validated input shape | `src/inputValidations/*` (shared client↔server) |
| Add a DB field/model | `src/models/*` |
| Change a screen | `src/app/(app|auth|admin)/…` and `src/components/*` |
| Restyle / theme | `src/app/globals.css` + `tailwind.config.ts` (token variables) |
| Gate a route by auth/role | `src/middleware.ts` |
| Change env/config contract | `src/lib/env.ts` (+ `.env.example`) |

**Conventions:** validate every route with Zod; keep client components thin; guard
every AI call (rate-limit→cache→quota); make credit writes idempotent; never store
secrets in the repo (`.env` is gitignored).

---

## 9. Glossary (Candor-specific terms)

- **Growth plan** — an AI-generated set of tasks derived from clustering the user's
  feedback inbox; tracked on the growth board.
- **Coach** — the receiver-side AI that turns the inbox into themes + a growth plan.
- **Composer** — the sender-side AI that polishes the sender's *own* words (never
  invents opinions — the "authenticity guardrail").
- **Credit ledger** — the append-only `creditEntry` log; balance = sum of deltas;
  idempotent via a unique `(userId, reason, refId)` index.
- **Quota** — a per-user daily AI-call budget in the KV store; topped up by redeeming credits.
- **KVStore** — the pluggable key-value interface (Upstash Redis in prod, in-memory in dev)
  backing rate-limit, cache, and quota.
- **Reserved username / `previousUsernames`** — names a user previously held, kept
  reserved and still resolvable so old public links never break.
- **Feature guards** — maintenance/registration flags in `appSettings`, read via `featureGuards`.
