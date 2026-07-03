'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Thin wrapper over the browser Web Speech API (SpeechRecognition).
 *
 * - Zero backend, zero cost, no audio leaves the browser.
 * - Capability-gated: `supported` is false in browsers without the API
 *   (Safari/Firefox), so the UI can hide the mic and fall back to typing.
 * - Emits only finalized transcript segments via `onResult`, so the caller can
 *   append them to its own editable text without fighting React state.
 */
export function useSpeechToText({
  onResult,
  lang = 'en-US',
}: {
  onResult: (finalText: string) => void
  lang?: string
}) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Keep the latest callback in a ref so we can init recognition exactly once.
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }

    setSupported(true)
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = lang

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          const text = String(result[0]?.transcript ?? '').trim()
          if (text) onResultRef.current(text)
        }
      }
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognitionRef.current = recognition
    return () => {
      try {
        recognition.stop()
      } catch {
        /* already stopped */
      }
    }
  }, [lang])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch {
      /* start() throws if already started — ignore */
    }
  }, [])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch {
      /* ignore */
    }
    setListening(false)
  }, [])

  return { supported, listening, start, stop }
}
