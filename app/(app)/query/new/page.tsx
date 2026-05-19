'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ArrowLeft, Camera, Upload, X, Loader2, AlertTriangle } from 'lucide-react'

interface Pet {
  id: string
  name: string
  species: string
  breed: string | null
}

export default function NewQueryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPetId = searchParams.get('pet')

  const [pets, setPets] = useState<Pet[]>([])
  const [selectedPetId, setSelectedPetId] = useState<string>(initialPetId || '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quotaExceeded, setQuotaExceeded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Common symptom presets
  const symptomPresets = [
    'Limping',
    'Vomiting',
    'Diarrhea',
    'Not eating',
    'Lethargy',
    'Coughing',
    'Sneezing',
    'Scratching',
    'Bleeding',
    'Swelling',
    'Eye discharge',
    'Bad breath',
  ]

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check quota
      const { data: profile } = await supabase
        .from('profiles')
        .select('free_queries_used, subscription_status')
        .eq('id', user.id)
        .single()

      if (
        profile &&
        profile.subscription_status !== 'active' &&
        profile.free_queries_used >= 3
      ) {
        setQuotaExceeded(true)
      }

      const { data: petsData } = await supabase
        .from('pets')
        .select('id, name, species, breed')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (petsData) {
        setPets(petsData)
        if (!selectedPetId && petsData.length > 0) {
          setSelectedPetId(petsData[0].id)
        }
      }
      setLoading(false)
    }
    loadData()
  }, [])

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB')
      return
    }

    setPhotoFile(file)
    setError(null)

    const reader = new FileReader()
    reader.onload = (e) => setPhotoPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  function clearPhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function toggleSymptom(symptom: string) {
    setSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!photoFile || !selectedPetId) return

    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload photo to Supabase Storage
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('pet-photos')
        .upload(fileName, photoFile, {
          contentType: photoFile.type,
          cacheControl: '3600',
        })

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

      const { data: { publicUrl } } = supabase.storage
        .from('pet-photos')
        .getPublicUrl(fileName)

      // Call analyze API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: selectedPetId,
          photo_url: publicUrl,
          description: description.trim() || null,
          symptoms: symptoms.length > 0 ? symptoms : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402) {
          router.push('/upgrade')
          return
        }
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
          <h1 className="font-display text-3xl font-bold text-ink mb-2">
            You've used your free assessments
          </h1>
          <p className="text-ink-mute mb-6">
            Upgrade to PawCheck Premium for unlimited assessments.
          </p>
          <Button asChild variant="accent" size="lg">
            <Link href="/upgrade">Upgrade now</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (pets.length === 0) {
    return (
      <div className="container max-w-2xl py-12">
        <div className="bg-card rounded-2xl border border-cream-300/60 p-8 text-center">
          <h1 className="font-display text-3xl font-bold text-ink mb-2">
            Add a pet first
          </h1>
          <p className="text-ink-mute mb-6">
            We need to know who we're assessing.
          </p>
          <Button asChild variant="default" size="lg">
            <Link href="/pet/new">Add your pet</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-8 lg:py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold text-ink leading-tight">
          New assessment
        </h1>
        <p className="mt-2 text-ink-mute">
          Upload a photo of the concern. The clearer the photo, the better the
          assessment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pet selector */}
        {pets.length > 1 && (
          <div className="bg-card rounded-2xl border border-cream-300/60 p-6">
            <Label htmlFor="pet" className="block mb-2">Which pet?</Label>
            <Select
              id="pet"
              required
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
            >
              {pets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} ({pet.breed || pet.species})
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Photo upload */}
        <div className="bg-card rounded-2xl border border-cream-300/60 p-6">
          <Label className="block mb-3">Photo of the concern</Label>
          
          {!photoPreview ? (
            <label className="block">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="sr-only"
              />
              <div className="border-2 border-dashed border-forest-600/20 rounded-xl p-12 text-center hover:border-forest-600/40 hover:bg-cream-100/50 transition-colors cursor-pointer">
                <Camera className="w-12 h-12 mx-auto text-forest-600/60 mb-3" strokeWidth={1.5} />
                <p className="font-medium text-ink mb-1">Tap to add a photo</p>
                <p className="text-sm text-ink-mute">
                  Or drag and drop. Max 10MB.
                </p>
              </div>
            </label>
          ) : (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full max-h-96 object-contain rounded-xl bg-cream-100"
              />
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-ink/80 text-cream-100 flex items-center justify-center hover:bg-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="mt-3 text-xs text-ink-mute">
            💡 Tip: Take photos in good lighting, close enough to see detail
            clearly. For skin issues, part the fur if possible.
          </div>
        </div>

        {/* Description */}
        <div className="bg-card rounded-2xl border border-cream-300/60 p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="description">What's going on?</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us what you're noticing. When did it start? Has it gotten worse? Anything else relevant?"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Quick symptoms (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {symptomPresets.map((symptom) => (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => toggleSymptom(symptom)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    symptoms.includes(symptom)
                      ? 'bg-forest-600 text-cream-100 border-forest-600'
                      : 'bg-transparent text-ink-soft border-cream-300 hover:border-forest-600/40 hover:text-ink'
                  }`}
                >
                  {symptom}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-urgency-red/10 border border-urgency-red/20 rounded-lg text-sm text-urgency-red">
            {error}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 text-sm">
          <p className="text-amber-900 leading-relaxed">
            <strong>Emergency?</strong> If your pet is having difficulty
            breathing, has been hit by a vehicle, ingested something toxic, is
            actively bleeding, or is unconscious — call an emergency vet
            immediately. Don't wait for an AI assessment.
          </p>
        </div>

        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="w-full"
          disabled={!photoFile || !selectedPetId || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing... (about 30 seconds)
            </>
          ) : (
            'Get assessment'
          )}
        </Button>
      </form>
    </div>
  )
}
