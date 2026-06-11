import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Camera, Plus, ChevronRight, Clock } from 'lucide-react'
import UrgencyBadge from '@/components/UrgencyBadge'
import { formatRelativeTime } from '@/lib/utils'
import { signPetPhotos } from '@/lib/storage'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, free_queries_used, subscription_status, total_queries_count')
    .eq('id', user.id)
    .single()

  const { data: pets } = await supabase
    .from('pets')
    .select('id, name, species, breed, date_of_birth')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: recentQueries } = await supabase
    .from('queries')
    .select('id, urgency, urgency_label, description_summary, created_at, status, photo_url, pet:pets(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Sign private pet-photo paths for display.
  const photoUrls = await signPetPhotos(supabase, (recentQueries || []).map((q) => q.photo_url))

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const hasPets = pets && pets.length > 0

  return (
    <div className="container max-w-5xl py-8 lg:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-ink leading-tight">
            Hi, {firstName}.
          </h1>
          <p className="mt-2 text-ink-mute">
            How can we help your pet today?
          </p>
        </div>
        {hasPets && (
          <Button asChild variant="accent" size="lg">
            <Link href="/query/new">
              <Camera className="w-4 h-4" />
              New assessment
            </Link>
          </Button>
        )}
      </div>

      {/* No pets yet state */}
      {!hasPets && (
        <div className="bg-card rounded-2xl border border-cream-300/60 p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-ink mb-2">
            Add your first pet
          </h2>
          <p className="text-ink-mute mb-6 max-w-md mx-auto">
            We'll use their breed, age, and history to give you more accurate
            assessments.
          </p>
          <Button asChild variant="default" size="lg">
            <Link href="/pet/new">
              Add a pet
            </Link>
          </Button>
        </div>
      )}

      {hasPets && (
        <>
          {/* Pets section */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-semibold text-ink">
                Your pets
              </h2>
              <Link
                href="/pet/new"
                className="text-sm text-forest-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add pet
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pets.map((pet) => (
                <div
                  key={pet.id}
                  className="bg-card rounded-xl border border-cream-300/60 p-5 hover:border-forest-600/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-display text-xl font-semibold text-ink">
                        {pet.name}
                      </h3>
                      <p className="text-sm text-ink-mute capitalize">
                        {pet.breed || pet.species}
                      </p>
                    </div>
                    <div className="text-2xl">
                      {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent queries */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-semibold text-ink">
                Recent assessments
              </h2>
              {recentQueries && recentQueries.length > 0 && (
                <Link
                  href="/history"
                  className="text-sm text-forest-600 hover:underline flex items-center gap-1"
                >
                  View all
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {!recentQueries || recentQueries.length === 0 ? (
              <div className="bg-card rounded-2xl border border-dashed border-cream-300 p-12 text-center">
                <Camera className="w-12 h-12 mx-auto text-ink-mute mb-3" strokeWidth={1.5} />
                <p className="text-ink-mute mb-4">No assessments yet</p>
                <Button asChild variant="default">
                  <Link href="/query/new">Start your first assessment</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentQueries.map((query: any) => (
                  <Link
                    key={query.id}
                    href={`/query/${query.id}`}
                    className="block bg-card rounded-xl border border-cream-300/60 p-5 hover:border-forest-600/30 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {query.photo_url && photoUrls.get(query.photo_url) && (
                        <div className="w-16 h-16 rounded-lg bg-cream-200 overflow-hidden flex-shrink-0">
                          <img
                            src={photoUrls.get(query.photo_url)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <UrgencyBadge urgency={query.urgency} label={query.urgency_label} />
                          <span className="text-xs text-ink-mute flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(query.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-ink line-clamp-2">
                          {query.description_summary || 'Processing...'}
                        </p>
                        <p className="text-xs text-ink-mute mt-1">
                          {query.pet?.name}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-ink-mute flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
