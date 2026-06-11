import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TrainingPlanDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { id } = await params
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: plan, error } = await supabase
    .from('training_plans')
    .select('*, pet:pets(name, species, breed)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !plan) notFound()

  return (
    <div className="container max-w-3xl py-8 lg:py-12">
      <Link
        href="/training"
        className="inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All training plans
      </Link>

      {/* Header */}
      <div className="bg-gradient-to-br from-forest-50 to-forest-100/40 rounded-2xl border border-forest-200 p-8 mb-6">
        <div className="text-sm text-forest-700 font-medium uppercase tracking-widest mb-2">
          {plan.duration_weeks}-week plan for {plan.pet?.name}
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-ink leading-tight">
          {plan.plan_title}
        </h1>
        <p className="mt-4 text-ink-soft leading-relaxed">
          {plan.plan_summary}
        </p>
      </div>

      {/* Professional referral warning */}
      {plan.raw_ai_response?.content?.[0]?.text &&
        JSON.parse(
          plan.raw_ai_response.content[0].text.replace(/^```json\s*|\s*```$/g, '')
        )?.professional_referral_recommended && (
          <div className="bg-amber-50 border-2 border-amber-200/60 rounded-2xl p-6 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h2 className="font-display text-xl font-semibold text-ink mb-2">
                  Professional help recommended
                </h2>
                <p className="text-ink-soft leading-relaxed">
                  This case warrants working with a certified professional. Look
                  for a CPDT-KA trainer (pet professional certification) or
                  veterinary behaviorist (DACVB) in your area. The exercises
                  below provide general management but are not a substitute for
                  hands-on coaching.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Weekly milestones */}
      {plan.weekly_milestones && plan.weekly_milestones.length > 0 && (
        <div className="bg-card rounded-2xl border border-cream-300/60 p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-ink mb-5 flex items-center gap-2">
            <Clock className="w-5 h-5 text-forest-600" />
            Weekly progression
          </h2>
          <div className="space-y-4">
            {plan.weekly_milestones.map((week: any, i: number) => (
              <div
                key={i}
                className="flex gap-4 p-4 bg-cream-100 rounded-xl"
              >
                <div className="font-display text-3xl font-bold text-amber-400 leading-none tabular-nums">
                  W{week.week}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-ink">{week.focus}</h3>
                  <p className="text-sm text-ink-soft mt-1">
                    <strong>Success:</strong> {week.success_criteria}
                  </p>
                  {week.exercises && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {week.exercises.map((ex: string) => (
                        <span
                          key={ex}
                          className="text-xs px-2 py-0.5 bg-forest-100 text-forest-700 rounded-full"
                        >
                          {ex}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily exercises */}
      {plan.daily_exercises && plan.daily_exercises.length > 0 && (
        <div className="bg-card rounded-2xl border border-cream-300/60 p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-ink mb-5">
            Daily exercises
          </h2>
          <div className="space-y-5">
            {plan.daily_exercises.map((ex: any, i: number) => (
              <div key={i} className="pb-5 border-b border-cream-300/60 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-ink">{ex.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-ink-mute">
                    <span className="px-2 py-0.5 bg-cream-200 rounded-full">
                      {ex.duration_min} min
                    </span>
                    <span className="px-2 py-0.5 bg-cream-200 rounded-full">
                      {ex.frequency}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-ink-soft leading-relaxed mb-2">
                  {ex.description}
                </p>
                {ex.what_to_avoid && (
                  <p className="text-sm text-amber-800 leading-relaxed bg-amber-50 p-2 rounded">
                    <strong>Avoid:</strong> {ex.what_to_avoid}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reinforcement tips */}
      {plan.reinforcement_tips && plan.reinforcement_tips.length > 0 && (
        <div className="bg-card rounded-2xl border border-cream-300/60 p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-ink mb-4">
            Keys to success
          </h2>
          <ul className="space-y-3">
            {plan.reinforcement_tips.map((tip: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-soft">
                <CheckCircle2 className="w-4 h-4 text-forest-500 flex-shrink-0 mt-0.5" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Red flags */}
      {plan.red_flags && plan.red_flags.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-ink mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            When to seek professional help
          </h2>
          <ul className="space-y-2">
            {plan.red_flags.map((flag: string, i: number) => (
              <li key={i} className="text-sm text-ink-soft flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button asChild variant="outline" className="w-full">
        <Link href="/training/new">Start another plan</Link>
      </Button>
    </div>
  )
}
