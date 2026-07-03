/**
 * Creates a second guest user and seeds 60 feedback messages into the FIRST
 * guest's inbox, attributed alternately to the two users ("from 2 users → 1").
 * Great for testing sort + pagination with a realistic volume.
 *
 * Usage:  node scripts/seedFeedback.mjs
 */
import fs from 'fs'
import dns from 'dns'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

function loadEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv('.env.local')
loadEnv('.env')

if (process.env.DNS_SERVERS) {
  try { dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean)) } catch {}
}

const uri = process.env.MONGOOSE_URI
const guest1Email = process.env.NEXT_PUBLIC_GUEST_EMAIL || 'guest@candor.app'
const guest1Password = process.env.NEXT_PUBLIC_GUEST_PASSWORD || 'Guest@1234'
const guest2Email = 'guest2@candor.app'
const guest2Password = 'Guest@1234'

if (!uri) {
  console.error('MONGOOSE_URI is not set.')
  process.exit(1)
}

const TEMPLATES = [
  'Your presentations are really clear and engaging.',
  'Try to give others more space to speak in meetings.',
  'You handled that tough client call with a lot of patience.',
  'Deadlines sometimes slip — earlier heads-up would help.',
  'Great job mentoring the new joiners.',
  'Your code reviews are thorough and kind.',
  'Consider documenting decisions so the team can follow.',
  'You stay calm under pressure, it is reassuring.',
  'Meetings could be shorter and more focused.',
  'Loved your creative fix for the caching issue.',
  'You could delegate more instead of doing it all yourself.',
  'Your positive attitude lifts the whole team.',
  'Sometimes feedback comes across as blunt — soften it a bit.',
  'You are always willing to help when someone is stuck.',
  'Following up on action items would make projects smoother.',
]

async function ensureUser(users, email, password, username) {
  const hashed = await bcrypt.hash(password, 10)
  await users.updateOne(
    { email },
    {
      $set: {
        username,
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
  return users.findOne({ email })
}

async function run() {
  await mongoose.connect(uri)
  const users = mongoose.connection.collection('users')

  const guest1 = await ensureUser(users, guest1Email, guest1Password, 'guest')
  const guest2 = await ensureUser(users, guest2Email, guest2Password, 'guest2')

  const now = Date.now()
  const COUNT = 60
  const messages = Array.from({ length: COUNT }, (_, i) => ({
    _id: new mongoose.Types.ObjectId(),
    content: `${TEMPLATES[i % TEMPLATES.length]} (#${i + 1})`,
    // Alternate the two senders → "from 2 users to 1". Hidden from the recipient.
    senderId: i % 2 === 0 ? guest2._id : guest1._id,
    // Distinct timestamps so newest = #60.
    createdAt: new Date(now - (COUNT - i) * 3600000),
  }))

  await users.updateOne({ _id: guest1._id }, { $set: { messages } })

  console.log(`Seeded ${COUNT} messages into ${guest1Email}'s inbox.`)
  console.log(`Second user ready: ${guest2Email} / ${guest2Password}`)
  console.log(`Pages at 6/page: ${Math.ceil(COUNT / 6)}`)
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
