import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, ShieldCheck, Stethoscope, Clock, Phone } from 'lucide-react'
import UrgencyBadge from '@/components/UrgencyBadge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { signPetPhoto } from '@/lib/storage'

interface PageProps {
  params: { id: string }
}

export default async function QueryDetailPage({ params }: PageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: query, error } = await supabase
    .from('queries')
    .select('*, pet:pets(name, species, breed)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !query) {
    notFound()
  }

  if (query.status === 'processing') {
    return <ProcessingState />
  }

  if (query.status === 'failed') {
    return <FailedState message={query.error_message} />
  }

  const photoUrl = await signPetPhoto(supabase, query.photo_url)

  const urgencyBgClass = {
    green: 'from-forest-50 to-forest-100/50 border-forest-200',
    yellow: 'from-amber-50 to-amber-100/60 border-amber-200',
    red: 'from-red-50 to-red-100/50 border-red-200',
  }[query.urgency as 'green' | 'yellow' | 'red'] || 'from-cream-100 to-cream-50 border-cream-300'

  return (
    <div className="container max-w-3xl py-8 lg:py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      {/* Header with urgency hero */}
      <div className={`rounded-2xl bg-gradient-to-br border p-8 mb-6 ${urgencyBgClass}`}>
        <UrgencyBadge urgency={query.urgency} label={query.urgency_label} size="lg" />
        
        <h1 className="font-display text-3xl md:text-4xl font-bold text-ink mt-4 leading-tight">
          {query.recommended_action}
        </h1>

        <div className="mt-4 flex items-center gap-4 text-sm text-ink-soft">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Confidence: <strong className="text-ink tabular-nums">{query.confidence_score}%</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {formatDate(query.created_at)}
          </span>
        </div>

        {query.urgency === 'red' && (
          <div className="mt-6 p-4 bg-card rounded-lg border border-red-200/60 flex gap-3">
            <Phone className="w-5 h-5 text-urgency-red flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-ink mb-1">
                Contact an emergency vet now
              </p>
              <p className="text-sm text-ink-soft">
                Search "emergency vet near me" or call ASPCA Animal Poison
                Control at (888) 426-4435 if poison-related.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Photo and description */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-2xl border border-cream-300/60 overflow-hidden">
          {photoUrl && (
            <img
              src={photoUrl}
              alt="Pet assessment"
              className="w-full aspect-square object-cover"
            />
          )}
        </div>
        <div className="bg-card rounded-2xl border border-cream-300/60 p-6">
          <h2 className="font-display text-xl font-semibold text-ink mb-3">
            What we observed
          </h2>
          <p className="text-ink-soft leading-relaxed">
            {query.description_summary}
          </p>
          {query.description && (
            <div className="mt-5 pt-5 border-t border-cream-300/60">
              <h3 className="text-sm font-semibold text-ink mb-2">
                Your description
              </h3>
              <p className="text-sm text-ink-soft italic">"{query.description}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Likely causes */}
      {query.likely_causes && query.likely_causes.length > 0 && (
        <div className="bg-card rounded-2xl border border-cream-300/60 p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-ink mb-1">
            Possible causes
          </h2>
          <p className="text-sm text-ink-mute mb-5">
            For your vet to evaluate, not a diagnosis.
          </p>
          <div className="space-y-3">
            {query.likely_causes.map((cause: any, i: number) => (
              <div
                key={i}
                className="p-4 bg-cream-100/50 rounded-xl border border-cream-300/60"
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h3 className="font-semibold text-ink">{cause.name}</h3>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                      cause.probability === 'high'
                        ? 'bg-forest-100 text-forest-700'
                        : cause.probability === 'moderate'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-cream-300 text-ink-soft'
                    }`}
                  >
                    {cause.probability} likelihood
                  </span>
                </div>
                <p className="text-sm text-ink-soft leading-relaxed">
                  {cause.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Red flags */}
      {query.red_flags && query.red_flags.length > 0 && (
        <div className="bg-card rounded-2xl border-2 border-amber-200/60 p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-ink mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Watch for these warning signs
          </h2>
          <ul className="space-y-2">
            {query.red_flags.map((flag: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-soft">
                <span className="text-amber-500 mt-1">•</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Vet questions */}
      {query.followup_questions && query.followup_questions.length > 0 && (
        <div className="bg-card rounded-2xl border border-cream-300/60 p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-ink mb-3 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-forest-600" />
            Questions to discuss with your vet
          </h2>
          <ul className="space-y-2">
            {query.followup_questions.map((q: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-soft">
                <span className="text-forest-500 font-mono text-xs mt-1 tabular-nums">
                  Q{i + 1}.
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-cream-200/60 rounded-xl p-5 mb-6 text-sm text-ink-soft leading-relaxed">
        <p className="font-medium text-ink mb-1">Important reminder</p>
        <p>
          This is informational only and not veterinary medical advice. Visual
          assessment has inherent limitations. Always consult a licensed
          veterinarian for diagnosis and treatment of your pet's condition.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild variant="outline" className="flex-1">
          <Link href="/history">View all assessments</Link>
        </Button>
        <Button asChild variant="accent" className="flex-1">
          <Link href="/query/new">New assessment</Link>
        </Button>
      </div>
    </div>
  )
}

function ProcessingState() {
  return (
    <div className="container max-w-2xl py-20 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-forest-100 mb-6">
        <div className="w-8 h-8 border-3 border-forest-600 border-t-transparent rounded-full animate-spin" />
      </div>
      <h1 className="font-display text-3xl font-bold text-ink mb-2">
        Analyzing your pet's photo
      </h1>
      <p className="text-ink-mute mb-6">
        Our AI is reviewing the image. This usually takes 20-40 seconds.
      </p>
      <p className="text-xs text-ink-mute">
        This page will update when the assessment is complete.
      </p>
      <script
        dangerouslySetInnerHTML={{
          __html: `setTimeout(() => window.location.reload(), 5000)`,
        }}
      />
    </div>
  )
}

function FailedState({ message }: { message: string | null }) {
  return (
    <div className="container max-w-2xl py-20 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 mb-6">
        <AlertCircle className="w-8 h-8 text-urgency-red" />
      </div>
      <h1 className="font-display text-3xl font-bold text-ink mb-2">
        Analysis failed
      </h1>
      <p className="text-ink-mute mb-6">
        {message || 'Something went wrong. Please try again.'}
      </p>
      <Button asChild variant="default">
        <Link href="/query/new">Try again</Link>
      </Button>
    </div>
  )
}
