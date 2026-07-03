/**
 * Creates (or updates) a verified admin account so you can sign in and reach the
 * Admin dashboard. The email is taken from the FIRST entry in ADMIN_EMAILS (that
 * list is what actually elevates the account to admin at sign-in); the password
 * comes from ADMIN_PASSWORD (default: Admin@1234). Idempotent (upsert by email).
 *
 * Usage:  node scripts/seedAdmin.mjs
 */
import fs from 'fs'
import dns from 'dns'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

function loadEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (!match) continue
    const value = match[2].replace(/^["']|["']$/g, '')
    if (!(match[1] in process.env)) process.env[match[1]] = value
  }
}
loadEnv('.env.local')
loadEnv('.env')

if (process.env.DNS_SERVERS) {
  try { dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean)) } catch {}
}

const uri = process.env.MONGOOSE_URI
const email = (process.env.ADMIN_EMAILS ?? '').split(',')[0].trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD || 'Admin@1234'

if (!uri || !email) {
  console.error('Need MONGOOSE_URI and ADMIN_EMAILS in .env.local / .env')
  process.exit(1)
}

async function run() {
  await mongoose.connect(uri)
  const users = mongoose.connection.collection('users')
  const hashed = await bcrypt.hash(password, 10)

  await users.updateOne(
    { email },
    {
      $set: {
        username: 'admin',
        email,
        password: hashed,
        isVerified: true,
        isAcceptingMessage: true,
        isBanned: false,
        role: 'admin',
        verificationCode: '000000',
        verificationCodeExpiry: new Date(),
      },
      $setOnInsert: { credits: 0, messages: [] },
    },
    { upsert: true }
  )

  console.log(`Admin account ready: ${email} / ${password}`)
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error('Admin seed failed:', err.message)
  process.exit(1)
})
