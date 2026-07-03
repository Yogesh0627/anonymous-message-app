import { z } from 'zod'

export const composeLengthEnum = z.enum(['short', 'medium', 'long'])
export const composeEmojiLevelEnum = z.enum(['none', 'some', 'lots'])

export type ComposeLength = z.infer<typeof composeLengthEnum>
export type ComposeEmojiLevel = z.infer<typeof composeEmojiLevelEnum>

/**
 * Shared contract for the AI composer. `prompt` carries the user's own rough
 * thoughts (the AI only rewrites these). Tone and mood are free-form strings so
 * the preset list can grow without touching the API.
 */
export const composeSchema = z.object({
  prompt: z.string().trim().min(1, 'Add a few thoughts first').max(1000),
  tone: z.string().trim().min(1).max(40),
  mood: z.string().trim().min(1).max(40),
  length: composeLengthEnum.default('medium'),
  emojiLevel: composeEmojiLevelEnum.default('none'),
})
