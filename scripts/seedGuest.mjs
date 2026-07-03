/**
 * Creates (or updates) a verified demo "guest" account so the Guest Login button
 * on the sign-in page works. Credentials come from NEXT_PUBLIC_GUEST_EMAIL /
 * NEXT_PUBLIC_GUEST_PASSWORD. Idempotent (upsert by email).
 *
 * Usage:  node scripts/seedGuest.mjs
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
const email = process.env.NEXT_PUBLIC_GUEST_EMAIL
const password = process.env.NEXT_PUBLIC_GUEST_PASSWORD

if (!uri || !email || !password) {
  console.error('Need MONGOOSE_URI, NEXT_PUBLIC_GUEST_EMAIL and NEXT_PUBLIC_GUEST_PASSWORD in .env.local')
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
        username: 'guest',
        email,
        password: hashed,
        isVerified: true,
        isAcceptingMessage: true,
        isBanned: false,
        role: 'user',
        verificationCode: '000000',
        verificationCodeExpiry: new Date(),
      },
      $setOnInsert: { credits: 0, messages: [] },
    },
    { upsert: true }
  )

  console.log(`Guest account ready: ${email} / ${password}`)
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error('Guest seed failed:', err.message)
  process.exit(1)
})
