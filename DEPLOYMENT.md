# Deploying Candor to Vercel

A complete, step-by-step guide to taking Candor from your laptop to a live URL —
including **exactly which keys and URLs you must change after the first deploy,
and where to change them.**

> **The one thing to understand up front:** three settings depend on your final
> domain (`NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`, and the Google OAuth redirect
> URI), but you don't *know* the domain until after the first deploy. So the flow
> is: **deploy once → read your URL → update those three → redeploy.** That's
> normal and expected. The [After the first deploy](#4-after-the-first-deploy--what-to-change-and-where) section is the heart of this guide.

---

## Contents
1. [Accounts you'll need](#1-accounts-youll-need)
2. [Prepare the external services](#2-prepare-the-external-services)
3. [First deploy to Vercel](#3-first-deploy-to-vercel)
4. [After the first deploy — what to change and where](#4-after-the-first-deploy--what-to-change-and-where)
5. [Full environment variable reference](#5-full-environment-variable-reference)
6. [Custom domain (optional)](#6-custom-domain-optional)
7. [Post-deploy: SEO & search console](#7-post-deploy-seo--search-console)
8. [Smoke test checklist](#8-smoke-test-checklist)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Accounts you'll need

| Service | Purpose | Required? |
| ------- | ------- | --------- |
| [GitHub](https://github.com) | Host the repo Vercel deploys from | ✅ |
| [Vercel](https://vercel.com) | Hosting / build / serverless functions | ✅ |
| [MongoDB Atlas](https://www.mongodb.com/atlas) | Database (replica set — required for the real-time inbox) | ✅ |
| [Resend](https://resend.com) | Transactional email (verification, password reset) | ✅ |
| [Google AI Studio](https://aistudio.google.com/app/apikey) | Gemini key for AI features | Recommended |
| [Google Cloud Console](https://console.cloud.google.com) | Google OAuth (“Continue with Google”) | Optional |
| [Upstash](https://upstash.com) | Redis for shared rate-limit / quota across instances | Optional |

---

## 2. Prepare the external services

Do this **before** deploying so you have the values ready to paste into Vercel.

### 2a. MongoDB Atlas
1. Create a free **M0** cluster (it's a 3-node replica set — change streams, which
   power the live inbox, need this).
2. **Database Access** → create a user (username + password). Avoid symbols that
   need URL-encoding, or remember to encode them (e.g. `@` → `%40`).
3. **Network Access** → **Add IP Address** → **Allow access from anywhere**
   (`0.0.0.0/0`). Vercel's serverless functions use dynamic IPs, so you can't
   whitelist a fixed one.
4. **Connect** → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/candor?retryWrites=true&w=majority
   ```
   Add your database name (`/candor`) before the `?`. This is your **`MONGOOSE_URI`**.

### 2b. Resend (email)
1. Create an API key → this is **`RESEND_API_KEY`**.
2. For the first deploy you can leave **`EMAIL_FROM`** as `onboarding@resend.dev`,
   but note: that sender **only delivers to your own Resend account email**. To
   email *anyone*, verify a domain (see [step 4d](#4d-resend--send-email-to-anyone)).

### 2c. Gemini (AI) — recommended
1. Create a key in Google AI Studio → this is **`GOOGLE_GENERATIVE_AI_API_KEY`**.
2. Without it, AI features (coach, moderation, suggestions) degrade gracefully;
   everything else works.

### 2d. Generate a NextAuth secret
Run locally and copy the output → this is **`NEXTAUTH_SECRET`**:
```bash
openssl rand -base64 32
```

### 2e. Google OAuth — optional (you'll finish this *after* the first deploy)
Create the credential now, but you can only fill the **redirect URI** once you
know your domain. In [Google Cloud Console](https://console.cloud.google.com):
1. **APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application**.
2. Leave the redirect URIs empty for now (or add `http://localhost:3000/...` for local).
3. Copy the **Client ID** (`GOOGLE_CLIENT_ID`) and **Client Secret** (`GOOGLE_CLIENT_SECRET`).

---

## 3. First deploy to Vercel

### 3a. Push to GitHub
```bash
git init
git add .
git commit -m "Candor: initial deploy"
git branch -M main
git remote add origin https://github.com/<you>/candor.git
git push -u origin main
```
> ✅ `.env` is gitignored — verify your real secrets are **not** in the commit.
> `.npmrc` (with `legacy-peer-deps=true`) **is** committed — Vercel needs it so
> `npm install` succeeds (this project has intentional peer-dep conflicts).

### 3b. Import into Vercel
1. **Vercel → Add New → Project → Import** your GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Build command `next build` and
   output are auto-configured — leave them.

### 3c. Add environment variables
In the import screen (or **Project → Settings → Environment Variables**), add the
values from step 2. For this **first** deploy, set the URL variables to a
placeholder — you'll correct them in step 4:

| Variable | Value for first deploy |
| -------- | ---------------------- |
| `MONGOOSE_URI` | your Atlas string |
| `NEXTAUTH_SECRET` | your generated secret |
| `NEXTAUTH_URL` | `https://placeholder.vercel.app` (fix in step 4) |
| `NEXT_PUBLIC_SITE_URL` | `https://placeholder.vercel.app` (fix in step 4) |
| `RESEND_API_KEY` | your Resend key |
| `EMAIL_FROM` | `onboarding@resend.dev` for now |
| `ADMIN_EMAILS` | the email you'll sign up with (grants you admin) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | your Gemini key |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional, if using OAuth |

Set each for **Production** (and Preview/Development if you want preview builds to work).

### 3d. Deploy
Click **Deploy**. When it finishes, Vercel gives you a URL like
`https://candor-abc123.vercel.app`. **Copy it — you need it for step 4.**

---

## 4. After the first deploy — what to change and where

This is the part people miss. Now that you know your real URL
(`https://candor-abc123.vercel.app`, or your custom domain), update these:

### Summary table

| # | What | Where to change it | Change to |
| - | ---- | ------------------ | --------- |
| a | `NEXTAUTH_URL` | Vercel → Settings → Environment Variables | your live URL |
| b | `NEXT_PUBLIC_SITE_URL` | Vercel → Settings → Environment Variables | your live URL |
| c | Google OAuth **redirect URI** + **JS origin** | Google Cloud Console → Credentials | your live URL (see below) |
| d | `EMAIL_FROM` (+ verify domain) | Resend dashboard, then Vercel env var | `noreply@yourdomain.com` |
| — | **Redeploy** | Vercel → Deployments → Redeploy | required for a/b/d to take effect |

> ⚠️ **Environment variable changes do NOT apply to the running site until you
> redeploy.** After editing a/b/d, go to **Deployments → ⋯ → Redeploy** (uncheck
> "use existing build cache" if you want a clean build).

### 4a & 4b. Point the app at its own domain
In **Vercel → Project → Settings → Environment Variables**, edit:
- **`NEXTAUTH_URL`** → `https://candor-abc123.vercel.app`
  (used by NextAuth for callback URLs and secure cookies — wrong value = login redirect loops)
- **`NEXT_PUBLIC_SITE_URL`** → `https://candor-abc123.vercel.app`
  (used for canonical tags, Open Graph URLs, `sitemap.xml`, `robots.txt`, and the OG image)

No trailing slash. Use the **exact** scheme + host you'll actually visit.

### 4c. Google OAuth — authorize your domain
In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services →
Credentials** → open your OAuth client → add:

- **Authorized JavaScript origins:**
  ```
  https://candor-abc123.vercel.app
  ```
- **Authorized redirect URIs:**
  ```
  https://candor-abc123.vercel.app/api/auth/callback/google
  ```
Keep your `http://localhost:3000/...` entries too so local dev still works. Save
(Google changes can take a few minutes to propagate).

> The redirect path is always `/api/auth/callback/google` — that's the NextAuth
> route. If you later add a custom domain, add **its** origin + redirect URI too.

### 4d. Resend — send email to anyone
By default emails only reach your own Resend account address. To email real users:
1. **Resend → Domains → Add Domain** → enter your domain.
2. Add the shown **DNS records** (SPF/DKIM) at your registrar; wait for
   **Verified**.
3. In **Vercel**, set **`EMAIL_FROM`** = `noreply@yourdomain.com` (a sender on the
   verified domain).
4. Redeploy.

### 4e. Redeploy
**Vercel → Deployments → most recent → ⋯ → Redeploy.** Your a/b/d changes are now live.

---

## 5. Full environment variable reference

All variables are validated at boot in [`src/lib/env.ts`](src/lib/env.ts) — a bad
config fails the build/start with a clear message. See [`.env.example`](.env.example)
for the annotated template.

| Variable | Required | Changes after deploy? | Notes |
| -------- | :------: | :-------------------: | ----- |
| `MONGOOSE_URI` | ✅ | no | Atlas connection string (with `/candor` db name) |
| `NEXTAUTH_SECRET` | ✅ | no | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | **YES → your domain** | Auth callbacks & cookies |
| `NEXT_PUBLIC_SITE_URL` | ✅* | **YES → your domain** | SEO: canonical, OG, sitemap, robots |
| `RESEND_API_KEY` | ✅ | no | Email sending |
| `EMAIL_FROM` | – | **YES (to email anyone)** | Must be on a Resend-verified domain |
| `ADMIN_EMAILS` | – | maybe | Comma-separated; grants admin on sign-in |
| `GOOGLE_CLIENT_ID` | – | no (but authorize domain) | OAuth; button hidden if unset |
| `GOOGLE_CLIENT_SECRET` | – | no | OAuth |
| `GOOGLE_GENERATIVE_AI_API_KEY` | – | no | Gemini; AI degrades gracefully if unset |
| `UPSTASH_REDIS_REST_URL` | – | no | Shared rate-limit/quota store |
| `UPSTASH_REDIS_REST_TOKEN` | – | no | Pairs with the URL |
| `DAILY_AI_CALLS` | – | no | Per-user daily AI budget (default 50) |
| `NEXT_PUBLIC_GUEST_EMAIL` | – | no | Prefills the demo/guest login button |
| `NEXT_PUBLIC_GUEST_PASSWORD` | – | no | Use a dedicated demo account, never a real one |

\* Not strictly required to boot (falls back to `http://localhost:3000`), but SEO
tags will be wrong in production until you set it.

> **`NEXT_PUBLIC_` prefix matters:** those two values are inlined into the client
> bundle **at build time**, so changing them *requires a redeploy* — an env edit
> alone won't update them.

---

## 6. Custom domain (optional)

1. **Vercel → Project → Settings → Domains → Add** → enter e.g. `candor.app`.
2. Add the DNS records Vercel shows (A / CNAME) at your registrar.
3. Once it's live, **repeat step 4** with the custom domain:
   - Update `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to `https://candor.app`.
   - Add `https://candor.app` origin + `https://candor.app/api/auth/callback/google`
     redirect URI in Google Cloud.
   - Redeploy.

---

## 7. Post-deploy: SEO & search console

1. Confirm these resolve on your live site:
   - `https://<domain>/robots.txt`
   - `https://<domain>/sitemap.xml`
   - `https://<domain>/opengraph-image` (the auto-generated social card)
2. [Google Search Console](https://search.google.com/search-console) → add your
   property → verify → **submit `https://<domain>/sitemap.xml`**.
3. Test the social preview by pasting your URL into the
   [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) or Slack.

---

## 8. Smoke test checklist

Run through this on the live URL after the step-4 redeploy:

- [ ] Landing page loads; light/dark toggle works.
- [ ] **Sign up** → verification email arrives → verify → land on dashboard.
- [ ] **Sign in with Google** works (if configured) — no redirect loop.
- [ ] Your `ADMIN_EMAILS` account sees the **Admin** link.
- [ ] Open your public link `/user/<username>` in an incognito window → send a
      message → it appears **live** in your inbox (real-time SSE).
- [ ] AI Coach generates a plan; credits/quota update.
- [ ] `robots.txt` and `sitemap.xml` return your production domain.

---

## 9. Troubleshooting

| Symptom | Likely cause & fix |
| ------- | ------------------ |
| **Build fails on `npm install` / peer deps** | Ensure `.npmrc` (`legacy-peer-deps=true`) is committed. As a fallback, set Vercel **Install Command** to `npm install --legacy-peer-deps`. |
| **Login redirects in a loop / “callback” errors** | `NEXTAUTH_URL` doesn't match the URL you're visiting, or you didn't redeploy after changing it. |
| **Google sign-in: `redirect_uri_mismatch`** | The exact redirect URI isn't in Google Cloud → add `https://<domain>/api/auth/callback/google`. Wait a few minutes. |
| **`MongooseServerSelectionError` / can't connect** | Atlas **Network Access** doesn't allow `0.0.0.0/0`, or the password in `MONGOOSE_URI` isn't URL-encoded. |
| **Real-time inbox not updating** | Your Mongo isn't a replica set (change streams unsupported). Use Atlas M0+, not a standalone `mongod`. |
| **Emails never arrive** | Using `onboarding@resend.dev` (only reaches your own account) — verify a domain and set `EMAIL_FROM`. Check Resend logs. |
| **OG image / canonical shows `localhost`** | `NEXT_PUBLIC_SITE_URL` still placeholder; update it and **redeploy** (it's build-time inlined). |
| **AI features silently do nothing** | `GOOGLE_GENERATIVE_AI_API_KEY` missing or out of quota. |
| **Env change not taking effect** | You must **redeploy** after editing environment variables. |

---

**Deploying an update later:** just `git push` to `main` — Vercel auto-builds and
deploys. CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs
lint → typecheck → test → build on every push as a safety net.
