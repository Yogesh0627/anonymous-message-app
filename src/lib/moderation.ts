import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"

/**
 * Moderates an anonymous message before it is stored. Because the platform is
 * anonymous, moderation is the main safety guard against harassment and abuse.
 *
 * Design choices:
 * - Fails OPEN when no API key is configured, so the app is fully usable in
 *   local dev / demos without a Gemini key. Configure the key in production to
 *   turn moderation on.
 * - Fails OPEN on model/network errors too — we never want moderation downtime
 *   to block all messaging. Errors are logged for observability.
 */

const moderationSchema = z.object({
  flagged: z.boolean(),
  category: z
    .enum(["harassment", "hate", "sexual", "self_harm", "violence", "none"])
    .default("none"),
  reason: z.string().default(""),
})

export type ModerationResult = z.infer<typeof moderationSchema> & {
  moderated: boolean
}

export async function moderateMessage(content: string): Promise<ModerationResult> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return { flagged: false, category: "none", reason: "", moderated: false }
  }

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: moderationSchema,
      prompt:
        "You are a content-moderation classifier for an anonymous messaging app. " +
        "Decide whether the following message contains harassment, hate speech, " +
        "sexual content, self-harm encouragement, or violent threats. Playful or " +
        "critical-but-civil feedback is allowed. Respond with the structured verdict.\n\n" +
        `Message: """${content}"""`,
    })

    return { ...object, moderated: true }
  } catch (error) {
    console.error("Moderation failed, allowing message:", error)
    return { flagged: false, category: "none", reason: "", moderated: false }
  }
}
