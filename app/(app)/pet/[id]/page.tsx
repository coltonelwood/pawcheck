import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Syringe, Camera, GraduationCap, Apple, Trash2 } from 'lucide-react'
import { calculateAge, formatDate } from '@/lib/utils'
import DeletePetButton from '@/components/DeletePetButton'

interface PageProps {
  params: { id: string }
}

export default async function PetDetailPage({ params }: PageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: pet, error } = await supabase
    .from('pets')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !pet) notFound()

  const [
    { count: queryCount },
    { count: trainingCount },
    { count: nutritionCount },
    { data: upcomingVaccines },
  ] = await Promise.all([
    supabase
      .from('queries')
      .select('id', { count: 'exact', head: true })
      .eq('pet_id', params.id),
    supabase
      .from('training_plans')
      .select('id', { count: 'exact', head: true })
      .eq('pet_id', params.id),
    supabase
      .from('nutrition_plans')
      .select('id', { count: 'exact', head: true })
      .eq('pet_id', params.id),
    supabase
      .from('vaccines')
      .select('id, name, due_date')
      .eq('pet_id', params.id)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })
      .limit(3),
  ])

  const age = calculateAge(pet.date_of_birth)

  return (
    <div className="container max-w-4xl py-8 lg:py-12">
      <Link
        href="/pets"
        className="inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All pets
      </Link>

      {/* Header */}
      <div className="bg-card rounded-2xl border border-cream-300/60 p-8 mb-6">
        <div className="flex items-start gap-6">
          <div className="text-6xl">
            {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-4xl font-bold text-ink leading-tight">
              {pet.name}
            </h1>
            <p className="text-ink-mute capitalize mt-1">
              {pet.breed || pet.species}
            </p>
            <div className="flex flex-wrap gap-3 mt-4 text-sm text-ink-soft">
              {age !== null && <span>{age} years old</span>}
              {pet.weight_lbs && <span className="tabular-nums">{pet.weight_lbs} lbs</span>}
              {pet.sex && pet.sex !== 'unknown' && (
                <span className="capitalize">{pet.sex}</span>
              )}
              {pet.spayed_neutered && <span>Spayed/Neutered</span>}
            </div>
          </div>
        </div>

        {(pet.known_conditions?.length || pet.current_medications?.length) && (
          <div className="mt-6 pt-6 border-t border-cream-300/60 space-y-3 text-sm">
            {pet.known_conditions?.length > 0 && (
              <div>
                <span className="text-ink-mute">Conditions: </span>
                <span className="text-ink">{pet.known_conditions.join(', ')}</span>
              </div>
            )}
            {pet.current_medications?.length > 0 && (
              <div>
                <span className="text-ink-mute">Medications: </span>
                <span className="text-ink">{pet.current_medications.join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Link
          href={`/query/new?pet=${pet.id}`}
          className="p-4 bg-card rounded-xl border border-cream-300/60 hover:border-forest-600/30 transition-colors text-center"
        >
          <Camera className="w-6 h-6 text-forest-600 mx-auto mb-2" />
          <div className="font-medium text-ink text-sm">New assessment</div>
        </Link>
        <Link
          href={`/pet/${pet.id}/vaccines`}
          className="p-4 bg-card rounded-xl border border-cream-300/60 hover:border-forest-600/30 transition-colors text-center"
        >
          <Syringe className="w-6 h-6 text-forest-600 mx-auto mb-2" />
          <div className="font-medium text-ink text-sm">Vaccines</div>
        </Link>
        <Link
          href={`/training/new?pet=${pet.id}`}
          className="p-4 bg-card rounded-xl border border-cream-300/60 hover:border-forest-600/30 transition-colors text-center"
        >
          <GraduationCap className="w-6 h-6 text-forest-600 mx-auto mb-2" />
          <div className="font-medium text-ink text-sm">Training</div>
        </Link>
        <Link
          href={`/nutrition/new?pet=${pet.id}`}
          className="p-4 bg-card rounded-xl border border-cream-300/60 hover:border-forest-600/30 transition-colors text-center"
        >
          <Apple className="w-6 h-6 text-forest-600 mx-auto mb-2" />
          <div className="font-medium text-ink text-sm">Nutrition</div>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 bg-card rounded-xl border border-cream-300/60 text-center">
          <div className="font-display text-2xl font-bold text-ink tabular-nums">
            {queryCount || 0}
          </div>
          <div className="text-xs text-ink-mute mt-1">Assessments</div>
        </div>
        <div className="p-4 bg-card rounded-xl border border-cream-300/60 text-center">
          <div className="font-display text-2xl font-bold text-ink tabular-nums">
            {trainingCount || 0}
          </div>
          <div className="text-xs text-ink-mute mt-1">Training plans</div>
        </div>
        <div className="p-4 bg-card rounded-xl border border-cream-300/60 text-center">
          <div className="font-display text-2xl font-bold text-ink tabular-nums">
            {nutritionCount || 0}
          </div>
          <div className="text-xs text-ink-mute mt-1">Nutrition plans</div>
        </div>
      </div>

      {/* Upcoming vaccines */}
      {upcomingVaccines && upcomingVaccines.length > 0 && (
        <div className="bg-card rounded-2xl border border-cream-300/60 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-ink">
              Upcoming vaccines
            </h2>
            <Link
              href={`/pet/${pet.id}/vaccines`}
              className="text-sm text-forest-600 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingVaccines.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 bg-cream-100 rounded-lg"
              >
                <span className="font-medium text-ink">{v.name}</span>
                <span className="text-sm text-ink-mute">
                  {formatDate(v.due_date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete pet (footer) */}
      <div className="mt-12 pt-6 border-t border-cream-300/60 flex justify-end">
        <DeletePetButton petId={pet.id} petName={pet.name} />
      </div>
    </div>
  )
}
