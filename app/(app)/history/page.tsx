import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Camera, Clock, ChevronRight } from 'lucide-react'
import UrgencyBadge from '@/components/UrgencyBadge'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/utils'
import { signPetPhotos } from '@/lib/storage'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: queries } = await supabase
    .from('queries')
    .select('id, urgency, urgency_label, description_summary, created_at, status, photo_url, pet:pets(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const photoUrls = await signPetPhotos(supabase, (queries || []).map((q) => q.photo_url))

  return (
    <div className="container max-w-4xl py-8 lg:py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink leading-tight">
            Assessment history
          </h1>
          <p className="mt-2 text-ink-mute">
            All your past pet assessments in one place.
          </p>
        </div>
        <Button asChild variant="accent">
          <Link href="/query/new">
            <Camera className="w-4 h-4" />
            New
          </Link>
        </Button>
      </div>

      {!queries || queries.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-cream-300 p-12 text-center">
          <Camera className="w-12 h-12 mx-auto text-ink-mute mb-3" strokeWidth={1.5} />
          <p className="text-ink-mute mb-4">No assessments yet</p>
          <Button asChild variant="default">
            <Link href="/query/new">Start your first assessment</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {queries.map((query: any) => (
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <UrgencyBadge urgency={query.urgency} label={query.urgency_label} />
                    <span className="text-xs text-ink-mute flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(query.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-ink line-clamp-2">
                    {query.description_summary || (query.status === 'processing' ? 'Processing...' : 'Failed')}
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
    </div>
  )
}
