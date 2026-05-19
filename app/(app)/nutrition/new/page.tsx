'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label, Textarea, Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ArrowLeft, Loader2, Sparkles, Apple } from 'lucide-react'

interface Pet {
  id: string
  name: string
  species: string
  breed: string | null
  weight_lbs: number | null
}

export default function NewNutritionPlanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPet = searchParams.get('pet')

  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [premiumRequired, setPremiumRequired] = useState(false)
  const [form, setForm] = useState({
    pet_id: initialPet || '',
    activity_level: 'moderate',
    goal: 'maintain',
    current_diet: '',
    food_preferences: '',
    allergies: '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: petData }, { data: profile }] = await Promise.all([
        supabase
          .from('pets')
          .select('id, name, species, breed, weight_lbs')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('subscription_status').single(),
      ])

      if (petData) {
        setPets(petData)
        if (!form.pet_id && petData.length > 0) {
          setForm((f) => ({ ...f, pet_id: petData[0].id }))
        }
      }

      if (profile?.subscription_status !== 'active') {
        setPremiumRequired(true)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const allergies = form.allergies
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)

      const res = await fetch('/api/nutrition/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: form.pet_id,
          activity_level: form.activity_level,
          goal: form.goal,
          current_diet: form.current_diet || undefined,
          food_preferences: form.food_preferences || undefined,
          allergies: allergies.length > 0 ? allergies : undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.requires_upgrade) {
          router.push('/upgrade')
          return
        }
        throw new Error(data.error || 'Generation failed')
      }

      router.push(`/nutrition/${data.plan_id}`)
    } catch (err: any) {
      setError(err.message)
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

  if (premiumRequired) {
    return (
      <div className="container max-w-2xl py-12">
        <div className="bg-card rounded-2xl border border-cream-300/60 p-8 text-center">
          <Sparkles className="w-12 h-12 mx-auto text-amber-500 mb-4" />
          <h1 className="font-display text-3xl font-bold text-ink mb-2">
            Premium feature
          </h1>
          <p className="text-ink-mute mb-6">
            AI nutrition plans require a Premium subscription.
          </p>
          <Button asChild variant="accent" size="lg">
            <Link href="/upgrade">Upgrade to Premium</Link>
          </Button>
        </div>
      </div>
    )
  }

  const selectedPet = pets.find((p) => p.id === form.pet_id)
  const missingWeight = selectedPet && !selectedPet.weight_lbs

  return (
    <div className="container max-w-2xl py-8 lg:py-12">
      <Link
        href="/nutrition"
        className="inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to nutrition
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold text-ink leading-tight">
          New nutrition plan
        </h1>
        <p className="mt-2 text-ink-mute">
          We calculate daily calories using AAFCO/WSAVA principles based on your pet's profile.
        </p>
      </div>

      {pets.length === 0 ? (
        <div className="bg-card rounded-2xl border border-cream-300/60 p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-ink mb-2">Add a pet first</h2>
          <Button asChild variant="default">
            <Link href="/pet/new">Add a pet</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-2xl border border-cream-300/60 p-6 space-y-5">
            {pets.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="pet_id">Which pet?</Label>
                <Select
                  id="pet_id"
                  value={form.pet_id}
                  onChange={(e) => setForm({ ...form, pet_id: e.target.value })}
                >
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.breed || p.species})
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {missingWeight && (
              <div className="p-4 bg-amber-50 border border-amber-200/60 rounded-lg text-sm text-amber-900">
                <strong>Weight required.</strong> Please add {selectedPet?.name}'s weight to their profile before generating a nutrition plan.{' '}
                <Link href={`/pet/${selectedPet?.id}`} className="underline">
                  Update profile
                </Link>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="activity_level">Activity level</Label>
              <Select
                id="activity_level"
                value={form.activity_level}
                onChange={(e) => setForm({ ...form, activity_level: e.target.value })}
              >
                <option value="sedentary">Sedentary (rarely active, indoor mostly)</option>
                <option value="light">Light (occasional walks/play)</option>
                <option value="moderate">Moderate (daily walks/play)</option>
                <option value="active">Active (2+ hr exercise daily)</option>
                <option value="very_active">Very active (working/sport dog)</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">Goal</Label>
              <Select
                id="goal"
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
              >
                <option value="maintain">Maintain current weight</option>
                <option value="weight_loss">Weight loss</option>
                <option value="weight_gain">Weight gain</option>
                <option value="muscle">Muscle development</option>
                <option value="puppy_growth">Puppy/kitten growth</option>
                <option value="senior_support">Senior support</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_diet">Current diet (optional)</Label>
              <Textarea
                id="current_diet"
                value={form.current_diet}
                onChange={(e) => setForm({ ...form, current_diet: e.target.value })}
                placeholder="What food/brand are they currently eating? How much per day?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="food_preferences">Food preferences (optional)</Label>
              <Input
                id="food_preferences"
                value={form.food_preferences}
                onChange={(e) => setForm({ ...form, food_preferences: e.target.value })}
                placeholder="Loves chicken, dislikes fish"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Known allergies (comma-separated)</Label>
              <Input
                id="allergies"
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                placeholder="chicken, beef, grain"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 text-sm text-amber-900">
            <strong>Not medical advice.</strong> If your pet has any chronic
            condition (kidney, liver, diabetes, IBD, allergies), please consult
            your veterinarian or a board-certified veterinary nutritionist
            (DACVN) instead of relying on AI guidance.
          </div>

          {error && (
            <div className="p-4 bg-urgency-red/10 border border-urgency-red/20 rounded-lg text-sm text-urgency-red">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="w-full"
            disabled={submitting || missingWeight}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculating... (30 seconds)
              </>
            ) : (
              <>
                <Apple className="w-4 h-4" />
                Generate plan
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
