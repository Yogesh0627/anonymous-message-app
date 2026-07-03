/**
 * Tone + mood presets for AI feedback generation.
 *
 * These are just suggestions surfaced in the "Suggest Messages" popup — the
 * backend accepts any free-form tone/mood string, so add/trim freely here
 * without touching the API. `label` is shown to the user; `value` is sent to
 * the model (and woven into the prompt).
 */
export interface AiPreset {
  value: string;
  label: string;
  /** Tiny emoji cue for the dropdown — purely decorative. */
  hint?: string;
}

/** How the copy is WRITTEN (style/register). */
export const TONES: AiPreset[] = [
  { value: "professional", label: "Professional", hint: "💼" },
  { value: "casual", label: "Casual", hint: "🙂" },
  { value: "friendly", label: "Friendly", hint: "🤝" },
  { value: "bold", label: "Bold", hint: "🔥" },
  { value: "witty", label: "Witty", hint: "😏" },
  { value: "inspirational", label: "Inspirational", hint: "✨" },
  { value: "educational", label: "Educational", hint: "📚" },
  { value: "persuasive", label: "Persuasive", hint: "🎯" },
  { value: "luxury", label: "Luxury / Premium", hint: "👑" },
  { value: "empathetic", label: "Empathetic", hint: "💗" },
  { value: "conversational", label: "Conversational", hint: "💬" },
  { value: "authoritative", label: "Authoritative", hint: "🏛️" },
];

/** The FEELING the reader should get (emotion/vibe). */
export const MOODS: AiPreset[] = [
  { value: "excited", label: "Excited", hint: "🤩" },
  { value: "joyful", label: "Joyful", hint: "😄" },
  { value: "calm", label: "Calm", hint: "😌" },
  { value: "confident", label: "Confident", hint: "💪" },
  { value: "urgent", label: "Urgent", hint: "⏰" },
  { value: "nostalgic", label: "Nostalgic", hint: "🕰️" },
  { value: "grateful", label: "Grateful", hint: "🙏" },
  { value: "curious", label: "Curious", hint: "🤔" },
  { value: "playful", label: "Playful", hint: "🎈" },
  { value: "celebratory", label: "Celebratory", hint: "🎉" },
  { value: "motivational", label: "Motivational", hint: "🚀" },
  { value: "reassuring", label: "Reassuring", hint: "🤗" },
  { value: "serious", label: "Serious", hint: "🧐" },
  { value: "hopeful", label: "Hopeful", hint: "🌅" },
];

/** Length presets, mapped to a phrase woven into the brief. */
export const LENGTHS: AiPreset[] = [
  { value: "short", label: "Short (1–2 lines)" },
  { value: "medium", label: "Medium (a short paragraph)" },
  { value: "long", label: "Long (detailed)" },
];

/** Emoji density presets. */
export const EMOJI_LEVELS: AiPreset[] = [
  { value: "none", label: "No emojis" },
  { value: "some", label: "A few emojis" },
  { value: "lots", label: "Lots of emojis" },
];
