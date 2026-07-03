import { connectDB } from '@/dbConfig/db'
import { authOptions } from '../../auth/[...nextauth]/options'
import { getServerSession, User } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { spend, getBalance } from '@/lib/credits'
import { grantAiBonus } from '@/lib/quota'
import { REDEEM_BUNDLES, isRedeemBundle, CREDIT_REASONS } from '@/lib/creditRules'
import { enforceRateLimit } from '@/lib/rateLimit'

const bodySchema = z.object({ bundle: z.string() })

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as User | undefined
  if (!session || !user?._id) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  }

  const limited = await enforceRateLimit(req, 'redeem', { limit: 10, windowMs: 60_000 })
  if (limited) return limited

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success || !isRedeemBundle(parsed.data.bundle)) {
    return NextResponse.json({ success: false, message: 'Unknown bundle' }, { status: 400 })
  }

  await connectDB()

  const { credits, aiCalls } = REDEEM_BUNDLES[parsed.data.bundle]

  // Atomically debit; only grant the AI bonus if the debit succeeded.
  const result = await spend(user._id, credits, CREDIT_REASONS.REDEEM_AI, randomUUID())
  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: `Not enough credits (need ${credits}).` },
      { status: 400 }
    )
  }

  await grantAiBonus(String(user._id), aiCalls)
  const balance = await getBalance(user._id)

  return NextResponse.json(
    { success: true, message: `Redeemed ${aiCalls} AI calls for today.`, balance },
    { status: 200 }
  )
}
