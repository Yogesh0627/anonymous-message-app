<div align="center">

# Candor

### Honest feedback, real growth.

Candor turns anonymous feedback into an **AI-coached, trackable growth loop**.
Share a personal link, receive candid messages, and let an AI coach convert them
into a growth plan you can actually work through — with credits, real-time
updates, moderation, and an admin console behind it all.

Built with the Next.js App Router, TypeScript, MongoDB, NextAuth, and Google Gemini.

[![CI](https://github.com/Yogesh0627/anonymous-message-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Yogesh0627/anonymous-message-app/actions)
![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

**Created by [Yogesh Chauhan](https://yogeshchauhan.dev)** ·
[LinkedIn](https://www.linkedin.com/in/yogeshchauhan-dev/) ·
[GitHub](https://github.com/Yogesh0627)

</div>

> **Live demo:** _add your Vercel URL here_
> **Guest login** is available on the sign-in page for one-click evaluation — no signup needed.

---

## Table of contents

- [Why Candor](#why-candor)
- [Features](#features)
- [Screenshots](#screenshots)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Testing & CI](#testing--ci)
- [Deployment](#deployment)
- [Security notes](#security-notes)
- [Roadmap](#roadmap)
- [License](#license)

---

## Why Candor

Most anonymous-message apps stop at "you got a message." Candor treats feedback as
the **start** of a loop, not the end:

1. **Receive** — anyone can send you honest, anonymous feedback through your public link.
2. **Understand** — AI moderates abuse and an **AI coach** clusters your inbox into themes.
3. **Act** — the coach drafts a concrete **growth plan** (To Do → In Progress → Completed) mapped back to the exact feedback that inspired it.
4. **Track** — check-ins, progress boards, and a credit economy keep the loop going.

---

## Features

### Core product
- 🕵️ **Anonymous messaging** — share `/user/{username}` and receive feedback without exposing sender identity.
- ⚡ **Real-time inbox** — new messages stream in live via **Server-Sent Events** backed by **MongoDB change streams**.
- 📊 **Inbox analytics** — total volume, a 7-day trend, and status breakdowns computed with a MongoDB aggregation pipeline.
- 🎛️ **Accept-messages toggle** to pause your inbox at any time.

### AI growth loop
- 🧠 **AI safety moderation** — incoming messages are screened by Gemini; abusive content is flagged before it reaches you.
- 🤖 **AI Feedback Coach** — clusters up to 50 messages over a chosen time window into themes and drafts an actionable plan.
- 🗺️ **Growth board** — accepted tasks flow through **To Do / In Progress / Completed**, each mapped to the feedback that created it.
- ✅ **Check-ins** — log progress against plan tasks over time.
- 🪄 **AI composer & suggestions** — Gemini-powered message suggestions streamed to the sender.

### Accounts & economy
- 🔐 **Auth** — email + password (NextAuth Credentials, bcrypt) **and Google OAuth**, JWT sessions.
- ✉️ **Email verification & password reset** via one-time codes (Resend + React Email).
- 🪙 **Credit ledger** — an **idempotent, append-only** ledger awards credits for activity and spends them on AI calls; redeemable bundles top up your daily AI budget.
- 📈 **Per-user AI quotas** — daily call budgets with graceful degradation when exhausted.

### Admin console
- 👥 **User management** — search, roles, and ban/unban.
- 🛡️ **Moderation queue** — review and action flagged messages.
- 🗺️ **Roadmap editor** — manage the public product roadmap.
- ⚙️ **App settings** & 📝 **audit log** — configurable platform settings with a full audit trail.
- 📊 **Platform stats** dashboard.

### Craft & polish
- 🌗 **Dark / light / system theme** with `next-themes` and semantic color tokens.
- 💬 **shadcn/ui tooltips** throughout, collapsible sidebar, topbar, skeleton loading states.
- 🔎 **Production-grade SEO** — Metadata API, `sitemap.xml`, `robots.txt`, JSON-LD structured data, and an **auto-generated Open Graph image**.
- 🛡️ **Server-side rate limiting** on messaging, sign-up, and OTP endpoints.
- ✅ **Zod validation** shared across client forms and API routes.
- 🔌 **Pluggable KV store** — Upstash Redis for shared rate limiting / caching / quotas, with an in-memory fallback for single-instance dev.

---

## Screenshots

> _Add screenshots or a GIF here — landing, dashboard, AI coach, and dark mode make a strong first impression._
>
> ```
> docs/screenshots/dashboard.png
> docs/screenshots/coach.png
> docs/screenshots/dark-mode.png
> ```

---

## Tech stack

| Layer        | Technology                                                        |
| ------------ | ----------------------------------------------------------------- |
| Framework    | Next.js 14 (App Router), React 18, TypeScript                     |
| Styling      | Tailwind CSS, shadcn/ui, Radix primitives, `next-themes`          |
| Auth         | NextAuth — Credentials (bcrypt) + Google OAuth, JWT sessions      |
| Database     | MongoDB + Mongoose (Atlas replica set for change streams)         |
| AI           | Google Gemini (`gemini-2.5-flash`) via the Vercel AI SDK          |
| Email        | Resend + React Email                                              |
| Validation   | Zod + react-hook-form                                             |
| Realtime     | Server-Sent Events + MongoDB change streams                      |
| Scale infra  | Upstash Redis (REST) with in-memory fallback                     |
| Testing / CI | Vitest, Playwright, GitHub Actions                                |

---

## Architecture

```
Browser ──> Next.js App Router
             ├── (auth)  sign-up / verify / sign-in / forgot-password
             ├── (app)   dashboard · coach · feedback · profile · help · roadmap   (middleware-protected)
             ├── (admin) users · moderation · roadmap · settings · audit · stats
             └── /api
                  ├── auth (NextAuth: Credentials + Google OAuth)
                  ├── sign-up · verifyCode · forgot-password         ──> Resend (email OTP)
                  ├── send-message      (public · rate-limited · Zod · AI-moderated)
                  ├── get/delete messages · analytics                ──> Mongo aggregation
                  ├── stream-messages   (SSE + change stream, real-time inbox)
                  ├── coach/inbox · coach/message                    ──> Gemini clustering
                  ├── growth/plans · growth/accept · growth/task · growth/checkin
                  ├── credits · credits/redeem · quota               ──> idempotent ledger
                  └── admin/* (users, moderation, roadmap, settings, audit, stats)
                          │
                          └──> MongoDB (Mongoose models)
                          └──> KV store (Upstash Redis | in-memory)
```

**Route protection** lives in [`src/middleware.ts`](src/middleware.ts): unauthenticated
users are redirected away from app routes, and authenticated users are redirected
away from the auth pages. Admin routes additionally check the user's role.

**Data models** ([`src/models/`](src/models)): `user`, `growthPlan`, `checkIn`,
`creditEntry`, `flaggedMessage`, `roadmapItem`, `appSettings`, `auditLog`,
`changeConfirmation`.

**Credit ledger** ([`src/lib/credits.ts`](src/lib/credits.ts)) is append-only with a
unique index on `userId + reason + refId`, so awards/spends are **idempotent** —
retries and races can't double-count.

---

## Getting started

### Prerequisites
- **Node.js 20+**
- A **MongoDB** database — [Atlas](https://www.mongodb.com/atlas) is recommended (change streams require a replica set; Atlas free tier works)
- A **[Resend](https://resend.com)** API key (email OTPs and notifications)
- A free **[Google AI Studio](https://aistudio.google.com/app/apikey)** key (optional — AI features degrade gracefully without it)
- _(optional)_ **Google OAuth** credentials and an **Upstash Redis** instance for production scale

### Setup

```bash
git clone https://github.com/Yogesh0627/anonymous-message-app.git
cd anonymous-message-app
npm install
cp .env.example .env      # then fill in the values (see below)
npm run dev
```

Open **http://localhost:3000**.

### Seed data (optional)

```bash
npm run seed:roadmap      # populate the public roadmap
npm run seed:guest        # create the one-click guest/demo account
npm run seed:feedback     # add sample feedback to explore the coach
```

---

## Environment variables

All variables are validated at startup in [`src/lib/env.ts`](src/lib/env.ts), so a
misconfigured deployment fails fast with a clear message.

| Variable                          | Required | Description                                                             |
| --------------------------------- | :------: | ----------------------------------------------------------------------- |
| `MONGOOSE_URI`                    |    ✅    | MongoDB connection string (Atlas or local).                             |
| `NEXTAUTH_SECRET`                 |    ✅    | Session signing secret — `openssl rand -base64 32`.                     |
| `NEXTAUTH_URL`                    |    ✅    | App origin (e.g. `http://localhost:3000`).                              |
| `RESEND_API_KEY`                  |    ✅    | Resend API key for transactional email.                                 |
| `NEXT_PUBLIC_SITE_URL`            |    –     | Public origin for canonical URLs, OG tags, sitemap & robots.            |
| `EMAIL_FROM`                      |    –     | Sender address (default `onboarding@resend.dev`; verify a domain to email anyone). |
| `ADMIN_EMAILS`                    |    –     | Comma-separated emails bootstrapped to the admin role.                  |
| `GOOGLE_CLIENT_ID` / `_SECRET`    |    –     | Google OAuth — omit to hide the "Continue with Google" button.          |
| `GOOGLE_GENERATIVE_AI_API_KEY`    |    –     | Gemini key — AI features (coach, moderation, suggestions) need this.    |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` |  –     | Shared KV store for multi-instance rate limiting/cache/quota.           |
| `DAILY_AI_CALLS`                  |    –     | Base per-user daily AI-call budget (default `50`).                      |
| `NEXT_PUBLIC_GUEST_EMAIL` / `_PASSWORD` | –  | Prefill the guest-login button (use a dedicated demo account).          |

See [`.env.example`](.env.example) for the fully annotated template.

> ⚠️ **Never commit `.env`.** It's gitignored — keep it that way, and rotate any
> secret that has ever been shared.

---

## Scripts

| Command               | Description                                  |
| --------------------- | -------------------------------------------- |
| `npm run dev`         | Start the dev server                         |
| `npm run build`       | Production build                             |
| `npm run start`       | Serve the production build                   |
| `npm run lint`        | ESLint                                       |
| `npm run typecheck`   | TypeScript, no emit                          |
| `npm test`            | Run the Vitest suite                         |
| `npm run test:watch`  | Vitest in watch mode                         |
| `npm run test:e2e`    | Playwright end-to-end tests                  |
| `npm run seed:*`      | Seed roadmap / guest / feedback data         |

---

## Project structure

```
src/
├── app/
│   ├── (app)/           # authenticated shell: dashboard, coach, feedback, profile, help, roadmap
│   ├── (auth)/          # sign-up, verify, sign-in, forgot-password
│   ├── admin/           # admin console
│   ├── api/             # route handlers (auth, messaging, coach, growth, credits, admin)
│   ├── user/[username]/ # public message page
│   ├── layout.tsx       # root layout + SEO metadata
│   ├── opengraph-image.tsx  # auto-generated OG/Twitter card
│   ├── robots.ts        # robots.txt
│   ├── sitemap.ts       # sitemap.xml
│   └── page.tsx         # landing page + JSON-LD
├── components/          # UI: Sidebar, Topbar, Footer, ThemeToggle, coach widgets, shadcn/ui
├── lib/                 # credits, quota, coach, moderation, store (KV), rateLimit, env, audit
├── models/              # Mongoose schemas
├── schemas/             # Zod schemas shared client/server
└── middleware.ts        # route protection
```

---

## Testing & CI

Unit tests cover the validation schemas, rate limiter, credit rules, and KV infra:

```bash
npm test          # unit (Vitest)
npm run test:e2e  # end-to-end (Playwright)
```

**CI** runs lint → typecheck → test → build on every push and pull request
(see [`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

---

## Deployment

> 📘 **Full walkthrough:** see [`DEPLOYMENT.md`](DEPLOYMENT.md) — including exactly
> which keys/URLs to change after the first deploy and where.

Candor deploys cleanly to **Vercel**:

1. Import the repo and set all environment variables from the table above.
2. Set `NEXT_PUBLIC_SITE_URL` and `NEXTAUTH_URL` to your production domain.
3. Use a **MongoDB Atlas** cluster (replica set required for the real-time inbox).
4. Add your production callback URL to the Google OAuth client:
   `https://your-domain/api/auth/callback/google`.
5. Verify a domain in Resend and set `EMAIL_FROM` to send email to anyone.
6. _(recommended)_ Add Upstash Redis for shared rate limiting and quotas.

After deploy, submit `https://your-domain/sitemap.xml` in Google Search Console.

---

## Security notes

- Passwords are hashed with **bcrypt**; plaintext is never stored.
- **One-time codes** (email verification, password reset) are generated with a CSPRNG
  (`crypto.randomInt`), **bcrypt-hashed at rest**, compared in constant time, and
  **burned after a single use** ([`src/lib/otp.ts`](src/lib/otp.ts)). A database leak
  exposes hashes, not live codes, and a consumed code can never be replayed.
- OTP and messaging endpoints are **rate-limited** ([`src/lib/rateLimit.ts`](src/lib/rateLimit.ts));
  this includes the password-reset `POST` that *consumes* the code, since a 6-digit
  code is only 10⁶ wide. The shared store swaps to Upstash Redis for horizontal
  scaling with unchanged call sites.
- The **credit ledger is idempotent** — a unique index prevents double-award/double-spend under retries or races.
- The **AI quota bonus is granted atomically** (`INCRBY`), so concurrent redemptions cannot lose an update.
- Incoming messages are **AI-moderated** before storage. Moderation **fails open** by
  design (availability over safety) and is backstopped by an admin review queue that
  bans the sender when a flag is upheld.
- **Environment variables are validated at startup**, so misconfiguration fails fast.
- Admin actions are recorded in an **audit log**, and `/admin` is gated both in
  middleware and independently on every admin route.

---

## Documentation

| Doc | What's inside |
| --- | ------------- |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Request lifecycle, module-by-module map, core flows, and the rationale for every dependency |
| [`DESIGN.md`](DESIGN.md) | Design doc for the AI features + the "AI at scale" infra (rate-limit / cache / quota) |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Full Vercel deploy guide — which keys/URLs to change after deploy, and where |


## Roadmap

- [x] Real-time inbox (SSE + MongoDB change streams)
- [x] AI moderation of incoming messages
- [x] AI Feedback Coach + trackable growth board
- [x] Idempotent credit ledger & per-user AI quotas
- [x] Google OAuth
- [x] Dark / light / system theme
- [x] Admin console (users, moderation, roadmap, settings, audit)
- [x] Production SEO (metadata, sitemap, robots, JSON-LD, OG image)
- [ ] GitHub OAuth
- [ ] Progressive Web App (installable, offline shell)
- [ ] Shared Redis rate-limit store enabled by default in production

The live roadmap is managed in-app at `/roadmap` (admins edit it from the console).

---

## License

Released under the **MIT License** — see [`LICENSE`](LICENSE).

---

<div align="center">

**Built by [Yogesh Chauhan](https://yogeshchauhan.dev)**
[Portfolio](https://yogeshchauhan.dev) ·
[LinkedIn](https://www.linkedin.com/in/yogeshchauhan-dev/) ·
[GitHub](https://github.com/Yogesh0627)

_If Candor helped or impressed you, a ⭐ on the repo means a lot._

</div>
