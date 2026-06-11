'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label, Textarea, Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ArrowLeft, Camera, X, Loader2, AlertTriangle, MessageSquare, ListChecks } from 'lucide-react'
import { SYMPTOM_CATEGORIES, getCategory } from '@/lib/assessment-questions'

type Mode = 'select' | 'photo' | 'describe' | 'guided'

interface Pet {
  id: string
  name: string
  species: string
  breed: string | null
}

const symptomPresets = [
  'Limping', 'Vomiting', 'Diarrhea', 'Not eating', 'Lethargy', 'Coughing',
  'Sneezing', 'Scratching', 'Bleeding', 'Swelling', 'Eye discharge', 'Bad breath',
]

export default function NewQueryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPetId = searchParams.get('pet')

  const [mode, setMode] = useState<Mode>('select')
  const [pets, setPets] = useState<Pet[]>([])
  const [selectedPetId, setSelectedPetId] = useState<string>(initialPetId || '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [guidedCategory, setGuidedCategory] = useState<string>('')
  const [guidedAnswers, setGuidedAnswers] = useState<Record<string, string | boolean>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quotaExceeded, setQuotaExceeded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data: profile } = await supabase
          .from('profiles')
          .select('free_queries_used, subscription_status')
          .eq('id', user.id)
          .single()
        if (profile && profile.subscription_status !== 'active' && profile.free_queries_used >= 3) {
          setQuotaExceeded(true)
        }

        const { data: petsData } = await supabase
          .from('pets')
          .select('id, name, species, breed')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (petsData) {
          setPets(petsData)
          if (!selectedPetId && petsData.length > 0) setSelectedPetId(petsData[0].id)
        }
      } catch {
        setError('Could not load your pets. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return }
    setPhotoFile(file)
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function clearPhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function toggleSymptom(s: string) {
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  function setGuidedAnswer(id: string, value: string | boolean) {
    setGuidedAnswers((prev) => ({ ...prev, [id]: value }))
  }

  const canSubmit =
    !!selectedPetId &&
    ((mode === 'photo' && !!photoFile) ||
      (mode === 'describe' && description.trim().length > 0) ||
      (mode === 'guided' && !!guidedCategory))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload a photo if one was attached (optional for describe/guided).
      let photo_path: string | null = null
      if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('pet-photos')
          .upload(fileName, photoFile, { contentType: photoFile.type, cacheControl: '3600' })
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
        photo_path = fileName
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: selectedPetId,
          input_method: mode,
          photo_path,
          description: description.trim() || null,
          symptoms: mode === 'photo' && symptoms.length > 0 ? symptoms : null,
          guided: mode === 'guided' ? { category: guidedCategory, answers: guidedAnswers } : null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 402) { router.push('/upgrade'); return }
        throw new Error(data.error || 'Analysis failed')
      }
      router.push(`/query/${data.query_id}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-forest-600" />
      </div>
    )
  }

  if (quotaExceeded) {
    return (
      <div className="container max-w-2xl py-12">
        <div className="bg-card rounded-2xl border border-cream-300/60 p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
          <h1 className="font-display text-3xl font-bold text-ink mb-2">You&apos;ve used your free assessments</h1>
          <p className="text-ink-mute mb-6">Upgrade to PawCheck Premium for unlimited assessments.</p>
          <Button asChild variant="accent" size="lg"><Link href="/upgrade">Upgrade now</Link></Button>
        </div>
      </div>
    )
  }

  if (pets.length === 0) {
    return (
      <div className="container max-w-2xl py-12">
        <div className="bg-card rounded-2xl border border-cream-300/60 p-8 text-center">
          <h1 className="font-display text-3xl font-bold text-ink mb-2">Add a pet first</h1>
          <p className="text-ink-mute mb-6">We need to know who we&apos;re assessing.</p>
          <Button asChild variant="default" size="lg"><Link href="/pet/new">Add your pet</Link></Button>
        </div>
      </div>
    )
  }

  const category = getCategory(guidedCategory)

  const photoBlock = (required: boolean) => (
    <div className="bg-card rounded-2xl border border-cream-300/60 p-6">
      <Label className="block mb-3">{required ? 'Photo of the concern' : 'Add a photo (optional)'}</Label>
      {!photoPreview ? (
        <label className="block">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="sr-only" />
          <div className="border-2 border-dashed border-forest-600/20 rounded-xl p-10 text-center hover:border-forest-600/40 hover:bg-cream-100/50 transition-colors cursor-pointer">
            <Camera className="w-10 h-10 mx-auto text-forest-600/60 mb-3" strokeWidth={1.5} />
            <p className="font-medium text-ink mb-1">Tap to add a photo</p>
            <p className="text-sm text-ink-mute">Max 10MB.</p>
          </div>
        </label>
      ) : (
        <div className="relative">
          <img src={photoPreview} alt="Preview" className="w-full max-h-96 object-contain rounded-xl bg-cream-100" />
          <button type="button" onClick={clearPhoto} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-ink/80 text-cream-100 flex items-center justify-center hover:bg-ink">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="container max-w-2xl py-8 lg:py-12">
      <button
        onClick={() => (mode === 'select' ? router.push('/dashboard') : (setMode('select'), setError(null)))}
        className="inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {mode === 'select' ? 'Back' : 'Choose a different way'}
      </button>

      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold text-ink leading-tight">New assessment</h1>
        <p className="mt-2 text-ink-mute">
          {mode === 'select' && 'Not every problem is something you can photograph. Pick whatever fits.'}
          {mode === 'photo' && 'Upload a photo of the concern — the clearer the better.'}
          {mode === 'describe' && 'Tell us what’s going on in your own words.'}
          {mode === 'guided' && 'Answer a few quick questions and we’ll take it from there.'}
        </p>
      </div>

      {/* Mode selection */}
      {mode === 'select' && (
        <div className="space-y-4">
          <OptionCard icon={<Camera className="w-6 h-6" />} title="Take a photo" desc="Best for skin, eyes, wounds, lumps — anything visible." onClick={() => setMode('photo')} />
          <OptionCard icon={<MessageSquare className="w-6 h-6" />} title="Describe the issue" desc="Limping, vomiting, lethargy, behavior changes — just type it out." onClick={() => setMode('describe')} />
          <OptionCard icon={<ListChecks className="w-6 h-6" />} title="Answer questions" desc="Not sure what to say? We’ll guide you with a few questions." onClick={() => setMode('guided')} />
        </div>
      )}

      {mode !== 'select' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pet selector */}
          {pets.length > 1 && (
            <div className="bg-card rounded-2xl border border-cream-300/60 p-6">
              <Label htmlFor="pet" className="block mb-2">Which pet?</Label>
              <Select id="pet" required value={selectedPetId} onChange={(e) => setSelectedPetId(e.target.value)}>
                {pets.map((pet) => (
                  <option key={pet.id} value={pet.id}>{pet.name} ({pet.breed || pet.species})</option>
                ))}
              </Select>
            </div>
          )}

          {/* PHOTO mode */}
          {mode === 'photo' && (
            <>
              {photoBlock(true)}
              <div className="bg-card rounded-2xl border border-cream-300/60 p-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="description">What&apos;s going on? (optional)</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="When did it start? Has it gotten worse? Anything else relevant?" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Quick symptoms (optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {symptomPresets.map((s) => (
                      <button key={s} type="button" onClick={() => toggleSymptom(s)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${symptoms.includes(s) ? 'bg-forest-600 text-cream-100 border-forest-600' : 'bg-transparent text-ink-soft border-cream-300 hover:border-forest-600/40 hover:text-ink'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* DESCRIBE mode */}
          {mode === 'describe' && (
            <>
              <div className="bg-card rounded-2xl border border-cream-300/60 p-6 space-y-2">
                <Label htmlFor="description">Tell us what&apos;s going on</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. He’s been limping on his back right leg since this morning and won’t put weight on it. Still eating normally." rows={6} autoFocus />
                <p className="text-xs text-ink-mute">The more detail — when it started, how often, any changes — the better the assessment.</p>
              </div>
              {photoBlock(false)}
            </>
          )}

          {/* GUIDED mode */}
          {mode === 'guided' && (
            <>
              <div className="bg-card rounded-2xl border border-cream-300/60 p-6">
                <Label className="block mb-3">What&apos;s the main concern?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SYMPTOM_CATEGORIES.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setGuidedCategory(c.id); setGuidedAnswers({}) }} className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium border text-left transition-colors ${guidedCategory === c.id ? 'bg-forest-600 text-cream-100 border-forest-600' : 'bg-transparent text-ink-soft border-cream-300 hover:border-forest-600/40'}`}>
                      <span className="text-lg">{c.emoji}</span>{c.label}
                    </button>
                  ))}
                </div>
              </div>

              {category && (
                <div className="bg-card rounded-2xl border border-cream-300/60 p-6 space-y-5">
                  {category.emergency && (
                    <div className="p-3 bg-urgency-red/10 border border-urgency-red/20 rounded-lg text-sm text-urgency-red">
                      This can be time-sensitive. If your pet is in distress, contact an emergency vet now.
                    </div>
                  )}
                  {category.followUps.map((fu) => (
                    <div key={fu.id} className="space-y-2">
                      <Label>{fu.label}</Label>
                      {fu.type === 'select' && (
                        <div className="flex flex-wrap gap-2">
                          {fu.options!.map((opt) => (
                            <button key={opt} type="button" onClick={() => setGuidedAnswer(fu.id, opt)} className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${guidedAnswers[fu.id] === opt ? 'bg-forest-600 text-cream-100 border-forest-600' : 'bg-transparent text-ink-soft border-cream-300 hover:border-forest-600/40'}`}>{opt}</button>
                          ))}
                        </div>
                      )}
                      {fu.type === 'boolean' && (
                        <div className="flex gap-2">
                          {[['Yes', true], ['No', false]].map(([label, val]) => (
                            <button key={String(val)} type="button" onClick={() => setGuidedAnswer(fu.id, val as boolean)} className={`px-5 py-1.5 rounded-full text-sm border transition-colors ${guidedAnswers[fu.id] === val ? 'bg-forest-600 text-cream-100 border-forest-600' : 'bg-transparent text-ink-soft border-cream-300 hover:border-forest-600/40'}`}>{label as string}</button>
                          ))}
                        </div>
                      )}
                      {fu.type === 'text' && (
                        <Input value={(guidedAnswers[fu.id] as string) || ''} onChange={(e) => setGuidedAnswer(fu.id, e.target.value)} placeholder={fu.placeholder} />
                      )}
                    </div>
                  ))}
                  <div className="space-y-2">
                    <Label htmlFor="addendum">Anything else to add? (optional)</Label>
                    <Textarea id="addendum" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                  </div>
                </div>
              )}

              {category && photoBlock(false)}
            </>
          )}

          {error && (
            <div className="p-4 bg-urgency-red/10 border border-urgency-red/20 rounded-lg text-sm text-urgency-red">{error}</div>
          )}

          <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 text-sm">
            <p className="text-amber-900 leading-relaxed">
              <strong>Emergency?</strong> If your pet is having difficulty breathing, has been hit by a vehicle,
              ingested something toxic, is actively bleeding, or is unconscious — call an emergency vet immediately.
              Don&apos;t wait for an AI assessment.
            </p>
          </div>

          <Button type="submit" variant="accent" size="lg" className="w-full" disabled={!canSubmit || submitting}>
            {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" />Analyzing… (about 30 seconds)</>) : 'Get assessment'}
          </Button>
        </form>
      )}
    </div>
  )
}

function OptionCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-start gap-4 bg-card rounded-2xl border border-cream-300/60 p-6 text-left hover:border-forest-600/40 hover:bg-cream-100/40 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-forest-50 text-forest-600 flex items-center justify-center flex-shrink-0">{icon}</div>
      <div>
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        <p className="text-sm text-ink-mute mt-0.5">{desc}</p>
      </div>
    </button>
  )
}
