import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, ChevronRight, Syringe } from 'lucide-react'
import { calculateAge } from '@/lib/utils'

export default async function PetsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: pets } = await supabase
    .from('pets')
    .select('id, name, species, breed, date_of_birth, weight_lbs, spayed_neutered')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Get vaccine due counts per pet
  const { data: dueVaccines } = await supabase
    .from('vaccines')
    .select('pet_id, due_date')
    .eq('user_id', user.id)
    .not('due_date', 'is', null)

  const dueCountsByPet = (dueVaccines || []).reduce((acc: Record<string, number>, v) => {
    const dueIn = (new Date(v.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    if (dueIn <= 30) acc[v.pet_id] = (acc[v.pet_id] || 0) + 1
    return acc
  }, {})

  return (
    <div className="container max-w-4xl py-8 lg:py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink leading-tight">
            Your pets
          </h1>
          <p className="mt-2 text-ink-mute">
            {pets?.length || 0} {pets?.length === 1 ? 'pet' : 'pets'} in your family.
          </p>
        </div>
        <Button asChild variant="accent">
          <Link href="/pet/new">
            <Plus className="w-4 h-4" />
            Add pet
          </Link>
        </Button>
      </div>

      {!pets || pets.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-cream-300 p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-amber-600" />
          </div>
          <p className="text-ink-mute mb-4">No pets yet</p>
          <Button asChild variant="default">
            <Link href="/pet/new">Add your first pet</Link>
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map((pet) => {
            const age = calculateAge(pet.date_of_birth)
            const dueCount = dueCountsByPet[pet.id] || 0
            return (
              <Link
                key={pet.id}
                href={`/pet/${pet.id}`}
                className="block bg-card rounded-2xl border border-cream-300/60 p-6 hover:border-forest-600/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">
                    {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                  </div>
                  <ChevronRight className="w-5 h-5 text-ink-mute group-hover:text-forest-600 transition-colors" />
                </div>
                <h3 className="font-display text-2xl font-semibold text-ink mb-1">
                  {pet.name}
                </h3>
                <p className="text-sm text-ink-mute capitalize mb-3">
                  {pet.breed || pet.species}
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {age !== null && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-cream-200 rounded-full text-ink-soft">
                      <Calendar className="w-3 h-3" />
                      {age} yrs
                    </span>
                  )}
                  {pet.weight_lbs && (
                    <span className="px-2 py-1 bg-cream-200 rounded-full text-ink-soft tabular-nums">
                      {pet.weight_lbs} lbs
                    </span>
                  )}
                  {dueCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                      <Syringe className="w-3 h-3" />
                      {dueCount} vaccine{dueCount > 1 ? 's' : ''} due
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
