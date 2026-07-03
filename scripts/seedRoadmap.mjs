/**
 * Seeds the product roadmap: the "Shipped" changelog of what's been built, plus
 * the "Planned" v2 features. Idempotent (upserts by title) — safe to re-run.
 *
 * Usage:  node scripts/seedRoadmap.mjs
 * Reads MONGOOSE_URI from .env.local / .env (or the environment).
 */
import fs from 'fs'
import dns from 'dns'
import mongoose from 'mongoose'

// --- minimal .env loader (no extra deps) ---
function loadEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (!match) continue
    const key = match[1]
    const value = match[2].replace(/^["']|["']$/g, '')
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnv('.env.local')
loadEnv('.env')

if (process.env.DNS_SERVERS) {
  try { dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean)) } catch {}
}

const uri = process.env.MONGOOSE_URI
if (!uri) {
  console.error('MONGOOSE_URI is not set (checked .env.local, .env, and the environment).')
  process.exit(1)
}

// Same shape + collection as src/models/roadmapItem.ts.
const schema = new mongoose.Schema({
  title: String,
  description: String,
  status: String,
  targetVersion: String,
  isPublic: Boolean,
  sortOrder: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})
const RoadmapItem = mongoose.model('RoadmapItemSeed', schema, 'roadmapitems')

const shipped = [
  'Anonymous messaging & public profile links',
  'Email verification & password reset (OTP)',
  'Real-time inbox (SSE + MongoDB change streams)',
  'AI content moderation',
  'AI feedback composer (speech-to-text, tone & intent)',
  'AI feedback coach (inbox themes + per-message advice)',
  'Growth plans & daily check-ins',
  'Loop-back "did you notice a change?" confirmations',
  'Credit economy (earn & redeem for AI)',
  'Distributed rate limiting, caching & quotas',
  'Admin console (RBAC, moderation, feature flags, audit log)',
  'Product roadmap',
  'Google OAuth sign-in',
  'Dark mode (light / dark / system)',
].map((title, i) => ({
  title,
  description: '',
  status: 'shipped',
  targetVersion: 'v1',
  isPublic: true,
  sortOrder: i,
}))

const planned = [
  ['GitHub OAuth sign-in', 'Sign in with GitHub too, alongside Google.'],
  ['Credit leaderboard, badges & streaks', 'Deepen the gamification with public standings and rewards.'],
  ['Notifications — weekly email digest & push', 'Get told when you receive feedback or a growth nudge.'],
  ['Anonymous threaded replies', 'Owners can respond to feedback without breaking anonymity.'],
  ['Teams & workspaces', 'Collect and act on feedback inside an organization.'],
  ['Slack integration & webhooks', 'Pipe new feedback and events into your tools.'],
  ['Data export & account deletion (GDPR)', 'Own and remove your data on request.'],
  ['PWA / installable app', 'A polished, installable experience on any device.'],
  ['Sentiment trends over time', 'Chart how the tone of your feedback shifts as you grow.'],
].map(([title, description], i) => ({
  title,
  description,
  status: 'planned',
  targetVersion: 'v2',
  isPublic: true,
  sortOrder: i,
}))

async function run() {
  await mongoose.connect(uri)
  const items = [...planned, ...shipped]
  for (const item of items) {
    await RoadmapItem.updateOne(
      { title: item.title },
      { $set: { ...item, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    )
  }
  // Prune items that were removed/renamed so the board stays in sync.
  const pruned = await RoadmapItem.deleteMany({ title: { $nin: items.map((i) => i.title) } })
  console.log(
    `Seeded ${items.length} roadmap items (${planned.length} planned, ${shipped.length} shipped); pruned ${pruned.deletedCount}.`
  )
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
