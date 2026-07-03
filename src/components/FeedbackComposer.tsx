'use client'
import { useCallback, useState } from 'react'
import { useCompletion } from 'ai/react'
import { Loader2, Mic, Sparkles, Square } from 'lucide-react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { SimpleTooltip } from './ui/tooltip'
import { useToast } from './ui/use-toast'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { TONES, MOODS, LENGTHS, EMOJI_LEVELS, type AiPreset } from '@/lib/aiPresets'

const PresetSelect = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: AiPreset[]
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.hint ? `${o.hint}  ${o.label}` : o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)

export default function FeedbackComposer({
  onUseDraft,
}: {
  onUseDraft: (text: string) => void
}) {
  const [thoughts, setThoughts] = useState('')
  const [tone, setTone] = useState('friendly')
  const [mood, setMood] = useState('confident')
  const [length, setLength] = useState('medium')
  const [emojiLevel, setEmojiLevel] = useState('none')
  const { toast } = useToast()

  const handleSpeech = useCallback((text: string) => {
    setThoughts((prev) => (prev ? `${prev} ${text}` : text))
  }, [])
  const speech = useSpeechToText({ onResult: handleSpeech })

  const { completion, complete, isLoading, setCompletion } = useCompletion({
    api: '/api/compose-feedback',
    onError: (err) => {
      toast({
        title: 'Could not generate',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      })
    },
  })

  const generate = async () => {
    if (!thoughts.trim()) return
    setCompletion('')
    await complete(thoughts, { body: { tone, mood, length, emojiLevel } })
  }

  const draft = completion.trim()

  return (
    <div className="p-6">
      <div className="mb-1 flex items-center gap-2 text-base font-semibold text-foreground">
        <Sparkles className="h-5 w-5 text-brand dark:text-brand" /> Compose with AI
      </div>
      <p className="mb-5 text-sm text-muted-foreground">
        Jot down (or dictate) your rough thoughts — the AI polishes your own words.
      </p>

      <div className="relative mb-5">
        <Textarea
          value={thoughts}
          onChange={(e) => setThoughts(e.target.value)}
          placeholder="e.g. great presenter but meetings run long and start late..."
          className="min-h-24 resize-none pr-12"
        />
        {speech.supported && (
          <span className="absolute right-2 top-2">
            <SimpleTooltip label={speech.listening ? 'Stop recording' : 'Dictate'}>
              <Button
                type="button"
                size="icon"
                variant={speech.listening ? 'destructive' : 'outline'}
                className="h-8 w-8"
                onClick={() => (speech.listening ? speech.stop() : speech.start())}
              >
                {speech.listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </SimpleTooltip>
          </span>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-x-4 gap-y-4">
        <PresetSelect label="Tone" value={tone} onChange={setTone} options={TONES} />
        <PresetSelect label="Mood" value={mood} onChange={setMood} options={MOODS} />
        <PresetSelect label="Length" value={length} onChange={setLength} options={LENGTHS} />
        <PresetSelect label="Emojis" value={emojiLevel} onChange={setEmojiLevel} options={EMOJI_LEVELS} />
      </div>

      <Button
        type="button"
        onClick={generate}
        disabled={isLoading || !thoughts.trim()}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Polishing…
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" /> Generate polished feedback
          </>
        )}
      </Button>

      {draft && (
        <div className="mt-5 space-y-3 rounded-lg border bg-muted p-4">
          <p className="text-sm leading-relaxed text-foreground">{draft}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{draft.length} characters</span>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onUseDraft(draft)
                toast({ title: 'Added to your message', description: 'Edit it freely before sending.' })
              }}
              disabled={isLoading}
            >
              Use this message
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
