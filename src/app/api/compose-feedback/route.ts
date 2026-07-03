import { google } from '@ai-sdk/google'
import { streamText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, User } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/options'
import { enforceRateLimit, getClientId } from '@/lib/rateLimit'
import { consumeAiQuota } from '@/lib/quota'
import { aiDisabledResponse } from '@/lib/featureGuards'
import { composeSchema } from '@/inputValidations/composeSchema'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, 'compose-feedback', {
    limit: 10,
    windowMs: 5 * 60_000,
  })
  if (limited) return limited

  const aiOff = await aiDisabledResponse()
  if (aiOff) return aiOff

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { success: false, message: 'AI features are not configured on this server.' },
      { status: 503 }
    )
  }

  const parsed = composeSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  // Quota is per-user when signed in, else per-client so anonymous use is also
  // metered. Counts against the shared daily AI budget.
  const session = await getServerSession(authOptions)
  const identifier =
    (session?.user as User | undefined)?._id ?? `anon:${getClientId(req)}`
  const quota = await consumeAiQuota(identifier)
  if (!quota.ok) {
    return NextResponse.json(
      {
        success: false,
        message: `Daily AI limit reached (${quota.limit}). Earn credits or try again tomorrow.`,
      },
      { status: 402 }
    )
  }

  const { prompt, tone, mood, length, emojiLevel } = parsed.data

  const lengthGuide: Record<string, string> = {
    short: 'Keep it to 1-2 short lines.',
    medium: 'Use a short paragraph.',
    long: 'Be a little more detailed.',
  }
  const emojiGuide: Record<string, string> = {
    none: 'Do not use any emojis.',
    some: 'Use a few tasteful emojis where they fit.',
    lots: 'Use plenty of emojis throughout.',
  }

  // Authenticity guardrail: polish the user's OWN points, never fabricate.
  const system = `You help a person rewrite their own rough notes into a single piece of clear, respectful, ANONYMOUS feedback addressed to someone.

Strict rules:
- Preserve the author's actual point and opinion. Do NOT invent opinions, facts, praise, or criticism that the notes do not imply.
- If the notes are empty or have no real substance, reply with a short request for more detail instead of fabricating feedback.
- Write in a ${tone} tone.
- Make the reader feel ${mood}.
- ${lengthGuide[length] ?? lengthGuide.medium}
- ${emojiGuide[emojiLevel] ?? emojiGuide.none}
- Always keep it under 300 characters (a hard message limit).
- Return ONLY the feedback text — no preamble, no surrounding quotes, no explanations.`

  try {
    const result = await streamText({
      model: google('gemini-2.5-flash'),
      system,
      prompt,
      maxTokens: 300,
    })
    return result.toDataStreamResponse()
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to generate. Please try again.' },
      { status: 500 }
    )
  }
}
