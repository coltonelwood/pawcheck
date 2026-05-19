'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function NewPetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    species: 'dog' as 'dog' | 'cat' | 'other',
    breed: '',
    date_of_birth: '',
    weight_lbs: '',
    sex: 'unknown' as 'male' | 'female' | 'unknown',
    spayed_neutered: false,
    known_conditions: '',
    current_medications: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const { data: pet, error: insertError } = await supabase
      .from('pets')
      .insert({
        user_id: user.id,
        name: form.name,
        species: form.species,
        breed: form.breed || null,
        date_of_birth: form.date_of_birth || null,
        weight_lbs: form.weight_lbs ? parseFloat(form.weight_lbs) : null,
        sex: form.sex,
        spayed_neutered: form.spayed_neutered,
        known_conditions: form.known_conditions
          ? form.known_conditions.split(',').map((c) => c.trim()).filter(Boolean)
          : null,
        current_medications: form.current_medications
          ? form.current_medications.split(',').map((m) => m.trim()).filter(Boolean)
          : null,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push(`/query/new?pet=${pet.id}`)
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
          Tell us about your pet
        </h1>
        <p className="mt-2 text-ink-mute">
          This information helps our AI give more accurate assessments. Only
          name and species are required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-2xl border border-cream-300/60 p-6 space-y-5">
          <h2 className="font-display text-xl font-semibold text-ink">
            The basics
          </h2>

          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-urgency-red">*</span>
            </Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Bella"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="species">
                Species <span className="text-urgency-red">*</span>
              </Label>
              <Select
                id="species"
                value={form.species}
                onChange={(e) => setForm({ ...form, species: e.target.value as any })}
              >
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="breed">Breed</Label>
              <Input
                id="breed"
                value={form.breed}
                onChange={(e) => setForm({ ...form, breed: e.target.value })}
                placeholder="Labrador Retriever"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight_lbs">Weight (lbs)</Label>
              <Input
                id="weight_lbs"
                type="number"
                step="0.1"
                value={form.weight_lbs}
                onChange={(e) => setForm({ ...form, weight_lbs: e.target.value })}
                placeholder="45"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sex">Sex</Label>
              <Select
                id="sex"
                value={form.sex}
                onChange={(e) => setForm({ ...form, sex: e.target.value as any })}
              >
                <option value="unknown">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </Select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.spayed_neutered}
                  onChange={(e) =>
                    setForm({ ...form, spayed_neutered: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-forest-600/30 text-forest-600 focus:ring-forest-600/20"
                />
                <span className="text-ink">Spayed/neutered</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-cream-300/60 p-6 space-y-5">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">
              Medical history
            </h2>
            <p className="text-sm text-ink-mute mt-1">
              Optional but recommended for better assessments
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="known_conditions">Known conditions</Label>
            <Textarea
              id="known_conditions"
              value={form.known_conditions}
              onChange={(e) =>
                setForm({ ...form, known_conditions: e.target.value })
              }
              placeholder="Allergies, hip dysplasia, diabetes (comma-separated)"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_medications">Current medications</Label>
            <Textarea
              id="current_medications"
              value={form.current_medications}
              onChange={(e) =>
                setForm({ ...form, current_medications: e.target.value })
              }
              placeholder="Apoquel, Heartgard (comma-separated)"
              rows={2}
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-urgency-red/10 border border-urgency-red/20 rounded-lg text-sm text-urgency-red">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/dashboard">Cancel</Link>
          </Button>
          <Button type="submit" variant="default" className="flex-1" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save & start assessment'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
