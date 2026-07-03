import { connectDB } from '@/dbConfig/db'
import UserModel from '@/models/user'
import { authOptions } from '../../auth/[...nextauth]/options'
import { getServerSession, User } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/rateLimit'
import { consumeAiQuota } from '@/lib/quota'
import { getStore } from '@/lib/store'
import { getOrCompute } from '@/lib/cache'
import { aiDisabledResponse } from '@/lib/featureGuards'
import { analyzeInbox } from '@/lib/coach'

export const maxDuration = 30

const DAY_MS = 24 * 60 * 60 * 1000

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as User | undefined
  if (!session || !user?._id) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  }

  const limited = await enforceRateLimit(req, 'coach-inbox', { limit: 5, windowMs: 5 * 60_000 })
  if (limited) return limited

  const aiOff = await aiDisabledResponse()
  if (aiOff) return aiOff

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { success: false, message: 'AI coaching is not configured on this server.' },
      { status: 503 }
    )
  }

  // Time window the user chose (defaults to all-time).
  const body = await req.json().catch(() => ({} as any))
  const RANGE_DAYS: Record<string, number | null> = { '7d': 7, '30d': 30, '90d': 90, all: null }
  const range = typeof body?.range === 'string' && body.range in RANGE_DAYS ? body.range : 'all'
  const days = RANGE_DAYS[range]
  const CAP = 50

  await connectDB()
  const found = await UserModel.findById(user._id).select('messages')
  const allMessages = found?.messages ?? []

  if (allMessages.length === 0) {
    return NextResponse.json(
      { success: false, message: 'No feedback yet — share your link to start receiving messages.' },
      { status: 404 }
    )
  }

  const since = days ? new Date(Date.now() - days * DAY_MS) : null
  const inRange = since
    ? allMessages.filter((m: any) => new Date(m.createdAt) >= since)
    : [...allMessages]

  if (inRange.length === 0) {
    return NextResponse.json(
      { success: false, message: 'No feedback in the selected time period.' },
      { status: 404 }
    )
  }

  // Newest first, then cap — so we analyze the most recent messages in the window.
  const recentFirst = inRange.sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const analyzed = recentFirst.slice(0, CAP)

  const meta = {
    range,
    analyzedCount: analyzed.length,
    totalInRange: inRange.length,
    totalMessages: allMessages.length,
  }

  // Cache per (range, window size, newest id) so different windows cache apart.
  const newestId = String(analyzed[0]?._id ?? '')
  const cacheKey = `coach:inbox:${user._id}:${range}:${inRange.length}:${newestId}`

  // Charge quota only on a cache miss.
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
    const analysis = await getOrCompute(cacheKey, DAY_MS, () =>
      analyzeInbox(analyzed.map((m: any) => String(m.content)))
    )

    // Map each plan's AI-provided message numbers (1-based into `analyzed`) back
    // to real message ids + a quote, so we record which feedback it addresses.
    const enriched = {
      ...analysis,
      growthPlan: (analysis.growthPlan ?? []).map((g: any) => {
        const idx: number[] = g.sourceIndexes ?? []
        const sources = idx.map((n) => analyzed[n - 1]).filter(Boolean)
        return {
          ...g,
          sourceMessageIds: sources.map((m: any) => String(m._id)),
          sourceCount: sources.length,
          sourceQuote: sources[0] ? String(sources[0].content).slice(0, 140) : '',
        }
      }),
    }

    return NextResponse.json(
      { success: true, message: 'Inbox analyzed', analysis: enriched, meta },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to analyze your inbox. Please try again.' },
      { status: 500 }
    )
  }
}
