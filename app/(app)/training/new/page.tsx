'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ArrowLeft, Loader2, Sparkles, GraduationCap } from 'lucide-react'

interface Pet {
  id: string
  name: string
  species: string
  breed: string | null
}

export default function NewTrainingPlanPage() {
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
    behavior_issue: '',
    goal: '',
    context: '',
    duration_weeks: 4,
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: petData }, { data: profile }] = await Promise.all([
        supabase
          .from('pets')
          .select('id, name, species, breed')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('subscription_status')
          .single(),
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
      const res = await fetch('/api/training/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      
      if (!res.ok) {
        if (data.requires_upgrade) {
          router.push('/upgrade')
          return
        }
        throw new Error(data.error || 'Generation failed')
      }
      
      router.push(`/training/${data.plan_id}`)
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
            AI training plans require a Premium subscription.
          </p>
          <Button asChild variant="accent" size="lg">
            <Link href="/upgrade">Upgrade to Premium</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (pets.length === 0) {
    return (
      <div className="container max-w-2xl py-12">
        <div className="bg-card rounded-2xl border border-cream-300/60 p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-ink mb-2">
            Add a pet first
          </h1>
          <Button asChild variant="default">
            <Link href="/pet/new">Add a pet</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-8 lg:py-12">
      <Link
        href="/training"
        className="inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to training
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold text-ink leading-tight">
          New training plan
        </h1>
        <p className="mt-2 text-ink-mute">
          Tell us what you're working on. We'll build a positive-reinforcement plan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-2xl border border-cream-300/60 p-6 space-y-5">
          {pets.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="pet_id">Which pet?</Label>
              <Select
                id="pet_id"
                required
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

          <div className="space-y-2">
            <Label htmlFor="behavior_issue">
              What behavior are you working on? <span className="text-urgency-red">*</span>
            </Label>
            <Textarea
              id="behavior_issue"
              required
              minLength={10}
              value={form.behavior_issue}
              onChange={(e) => setForm({ ...form, behavior_issue: e.target.value })}
              placeholder="Pulls on leash, jumps on guests, barks at the doorbell, has separation anxiety, etc. Be specific."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Your goal</Label>
            <Input
              id="goal"
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              placeholder="Walk calmly on leash without pulling"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Additional context (optional)</Label>
            <Textarea
              id="context"
              value={form.context}
              onChange={(e) => setForm({ ...form, context: e.target.value })}
              placeholder="When did this start? What have you tried? Anything that makes it better or worse?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration_weeks">Plan duration</Label>
            <Select
              id="duration_weeks"
              value={String(form.duration_weeks)}
              onChange={(e) => setForm({ ...form, duration_weeks: parseInt(e.target.value) })}
            >
              <option value="2">2 weeks (quick win)</option>
              <option value="4">4 weeks (typical)</option>
              <option value="6">6 weeks (moderate)</option>
              <option value="8">8 weeks (challenging behaviors)</option>
            </Select>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 text-sm text-amber-900">
          <strong>Safety note:</strong> For aggression, biting, severe anxiety, or
          resource guarding, please consult a certified professional trainer
          (CPDT-KA) or veterinary behaviorist. We'll flag those cases in your plan.
        </div>

        {error && (
          <div className="p-4 bg-urgency-red/10 border border-urgency-red/20 rounded-lg text-sm text-urgency-red">
            {error}
          </div>
        )}

        <Button type="submit" variant="accent" size="lg" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Building your plan... (30-60 seconds)
            </>
          ) : (
            <>
              <GraduationCap className="w-4 h-4" />
              Generate plan
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
