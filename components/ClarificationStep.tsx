'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Camera, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface Question {
  id?: string
  question: string
  options?: string[]
  allow_text?: boolean
}
interface Round {
  intro?: string
  questions?: Question[]
  photo_request?: { reason?: string; guidance?: string } | null
}

export default function ClarificationStep({
  queryId,
  round,
  userId,
}: {
  queryId: string
  round: Round
  userId: string
}) {
  const router = useRouter()
  const questions = round?.questions || []
  const photoReq = round?.photo_request || null
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const key = (q: Question, i: number) => q.id || String(i)

  async function submit(forceFinal: boolean) {
    setBusy(true)
    setError(null)
    try {
      let photo_path: string | null = null
      if (photoFile) {
        const supabase = createClient()
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        const { error: upErr } = await supabase.storage
          .from('pet-photos')
          .upload(fileName, photoFile, { contentType: photoFile.type, cacheControl: '3600' })
        if (!upErr) photo_path = fileName
      }
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query_id: queryId,
          input_method: 'describe',
          clarification_answers: answers,
          photo_path,
          force_final: forceFinal,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Could not continue')
      }
      router.refresh()
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="container max-w-2xl py-8 lg:py-12">
      <div className="inline-flex items-center gap-2 rounded-full border border-forest-200 bg-forest-50 px-3 py-1 text-xs font-bold text-forest-700">
        <MessageCircle className="h-3.5 w-3.5" />
        A couple quick questions
      </div>
      <h1 className="font-display text-2xl md:text-3xl font-bold text-ink mt-3 leading-tight">
        {round?.intro || 'To narrow this down, please answer what you can.'}
      </h1>

      <div className="mt-6 space-y-4">
        {questions.map((q, i) => (
          <div key={key(q, i)} className="bg-card rounded-2xl border border-cream-300/60 p-6">
            <p className="font-semibold text-ink">{q.question}</p>
            {Array.isArray(q.options) && q.options.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {q.options.map((opt) => {
                  const selected = answers[key(q, i)] === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, [key(q, i)]: opt }))}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                        selected
                          ? 'border-forest-600 bg-forest-600 text-white'
                          : 'border-cream-300 bg-cream-100/60 text-ink-soft hover:border-forest-300'
                      }`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}
            {q.allow_text !== false && (
              <textarea
                className="mt-3 w-full rounded-lg border border-cream-300 bg-cream-100/40 p-3 text-sm text-ink"
                placeholder="Add detail (optional)"
                rows={2}
                onChange={(e) => {
                  const v = e.target.value
                  setAnswers((a) => ({ ...a, [key(q, i)]: v }))
                }}
                value={
                  Array.isArray(q.options) && q.options.includes(answers[key(q, i)])
                    ? ''
                    : answers[key(q, i)] || ''
                }
              />
            )}
          </div>
        ))}

        {photoReq && (
          <div className="bg-card rounded-2xl border border-forest-200/60 p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <Camera className="h-5 w-5 text-forest-600" />
              A photo would help
            </h2>
            <p className="mt-1 text-sm text-ink-soft">{photoReq.guidance || photoReq.reason}</p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-cream-300 bg-cream-100/60 px-4 py-2 text-sm font-semibold text-ink-soft hover:border-forest-300">
              {photoFile ? (
                <>
                  <Check className="h-4 w-4 text-forest-600" /> {photoFile.name.slice(0, 24)}
                </>
              ) : (
                'Choose photo'
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        )}

        {error && <p className="text-sm text-urgency-red">{error}</p>}

        <Button variant="accent" className="w-full" disabled={busy} onClick={() => submit(false)}>
          {busy ? 'Thinking…' : 'Continue'}
        </Button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(true)}
          className="w-full text-center text-sm text-ink-mute underline disabled:opacity-50"
        >
          That&apos;s all I know — assess now
        </button>
      </div>
    </div>
  )
}
