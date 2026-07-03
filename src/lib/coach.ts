import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'

/**
 * The AI "feedback coach". Two capabilities:
 *  - analyzeInbox: aggregate a user's messages into themes, sentiment, and a
 *    concrete growth plan (the headline feature).
 *  - adviseMessage: actionable advice for a single message.
 *
 * Both use Gemini structured output (generateObject) so results are typed and
 * safe to render. Callers must ensure GOOGLE_GENERATIVE_AI_API_KEY is set and
 * are responsible for caching/quota (see the coach routes).
 */

const MODEL = 'gemini-2.5-flash'

export const inboxAnalysisSchema = z.object({
  summary: z.string(),
  sentiment: z.object({
    positive: z.number().int().min(0),
    neutral: z.number().int().min(0),
    negative: z.number().int().min(0),
  }),
  themes: z
    .array(
      z.object({
        label: z.string(),
        count: z.number().int().min(0),
        examples: z.array(z.string()).max(3),
      })
    )
    .max(6),
  growthPlan: z
    .array(
      z.object({
        title: z.string(),
        why: z.string(),
        firstStep: z.string(),
        // 1-based indices of the messages (from the numbered list) this plan addresses.
        sourceIndexes: z.array(z.number().int()).default([]),
      })
    )
    .max(5),
})

export type InboxAnalysis = z.infer<typeof inboxAnalysisSchema>

export const messageAdviceSchema = z.object({
  actionable: z.boolean(),
  summary: z.string(),
  steps: z.array(z.string()).max(5),
  tone: z.enum(['kind', 'harsh', 'neutral']),
})

export type MessageAdvice = z.infer<typeof messageAdviceSchema>

export async function analyzeInbox(contents: string[]): Promise<InboxAnalysis> {
  // Bound the token cost: analyze at most the 50 most recent messages.
  const sample = contents.slice(0, 50)

  const { object } = await generateObject({
    model: google(MODEL),
    schema: inboxAnalysisSchema,
    prompt:
      'You are a growth coach. Analyze the following anonymous feedback messages a ' +
      'person received. Group them into recurring themes (with counts and up to 3 ' +
      'short example quotes), estimate how many messages are positive / neutral / ' +
      'negative, and produce a short, encouraging growth plan of concrete steps. ' +
      'For each growth plan item, set sourceIndexes to the numbers of the messages ' +
      'below that the plan is based on. ' +
      'Base everything strictly on the messages — do not invent feedback.\n\n' +
      sample.map((c, i) => `${i + 1}. ${c}`).join('\n'),
  })

  return object
}

export async function adviseMessage(content: string): Promise<MessageAdvice> {
  const { object } = await generateObject({
    model: google(MODEL),
    schema: messageAdviceSchema,
    prompt:
      'A person received this single piece of anonymous feedback. Decide whether it ' +
      'is actionable, summarize it in one sentence, give up to 5 concrete steps to ' +
      'act on it, and classify its tone as kind, harsh, or neutral. If it is pure ' +
      'insult with no substance, say so and mark it not actionable.\n\n' +
      `Feedback: """${content}"""`,
  })

  return object
}
