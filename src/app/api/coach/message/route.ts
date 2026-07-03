import { connectDB } from '@/dbConfig/db'
import UserModel from '@/models/user'
import { authOptions } from '../../auth/[...nextauth]/options'
import { getServerSession, User } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { z } from 'zod'
import { enforceRateLimit } from '@/lib/rateLimit'
import { consumeAiQuota } from '@/lib/quota'
import { getStore } from '@/lib/store'
import { getOrCompute } from '@/lib/cache'
import { aiDisabledResponse } from '@/lib/featureGuards'
import { adviseMessage } from '@/lib/coach'

export const maxDuration = 30

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const bodySchema = z.object({ messageId: z.string().min(1) })

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as User | undefined
  if (!session || !user?._id) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  }

  const limited = await enforceRateLimit(req, 'coach-message', { limit: 20, windowMs: 5 * 60_000 })
  if (limited) return limited

  const aiOff = await aiDisabledResponse()
  if (aiOff) return aiOff

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { success: false, message: 'AI coaching is not configured on this server.' },
      { status: 503 }
    )
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid input' }, { status: 400 })
  }

  await connectDB()
  const found = await UserModel.findById(user._id).select('messages')
  const message = found?.messages?.find((m: any) => String(m._id) === parsed.data.messageId)
  if (!message) {
    return NextResponse.json({ success: false, message: 'Message not found' }, { status: 404 })
  }

  // Content-addressed cache: identical feedback text reuses advice across users.
  const hash = createHash('sha256').update(String(message.content)).digest('hex')
  const cacheKey = `coach:msg:${hash}`

  const isCached = (await getStore().get(cacheKey)) !== null
  if (!isCached) {
    const quota = await consumeAiQuota(String(user._id))
    if (!quota.ok) {
      return NextResponse.json(
        { success: false, message: `Daily AI limit reached (${quota.limit}). Try again tomorrow.` },
        { status: 402 }
      )
    }
  }

  try {
    const advice = await getOrCompute(cacheKey, WEEK_MS, () => adviseMessage(String(message.content)))
    return NextResponse.json({ success: true, message: 'Advice ready', advice }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to get advice. Please try again.' },
      { status: 500 }
    )
  }
}
