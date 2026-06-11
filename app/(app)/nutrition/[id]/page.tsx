import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, Apple, Clock, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function NutritionPlanDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { id } = await params
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: plan, error } = await supabase
    .from('nutrition_plans')
    .select('*, pet:pets(name, species, breed, weight_lbs)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !plan) notFound()

  // Parse the raw AI response for additional fields
  let rawData: any = {}
  try {
    const text = plan.raw_ai_response?.content?.[0]?.text || ''
    const cleaned = text.replace(/^```json\s*|\s*```$/g, '').trim()
    rawData = JSON.parse(cleaned)
  } catch {
    rawData = {}
  }

  const treatsBudget = rawData.treats_calorie_budget ?? Math.round(plan.daily_calories * 0.1)

  return (
    <div className="container max-w-3xl py-8 lg:py-12">
      <Link
        href="/nutrition"
        className="inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All nutrition plans
      </Link>

      {/* Header with calorie target */}
      <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 rounded-2xl border border-amber-200 p-8 mb-6">
        <div className="text-sm text-amber-800 font-medium uppercase tracking-widest mb-2">
          {plan.pet?.name}'s daily plan
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <div className="font-display text-6xl font-bold text-ink tabular-nums">
            {plan.daily_calories}
          </div>
          <div className="text-xl text-ink-mute font-medium">kcal/day</div>
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm text-ink-soft flex-wrap">
          <span className="capitalize">Goal: {plan.goal.replace('_', ' ')}</span>
          <span>·</span>
          <span className="capitalize">{plan.activity_level.replace('_', ' ')} activity</span>
          {plan.protein_grams && (
            <>
              <span>·</span>
              <span className="tabular-nums">{plan.protein_grams}g protein min</span>
            </>
          )}
        </div>
      </div>

      {/* Vet consultation warning if recommended */}
      {rawData.vet_consultation_recommended && (
        <div className="bg-amber-50 border-2 border-amber-200/60 rounded-2xl p-6 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h2 className="font-display text-xl font-semibold text-ink mb-2">
                Vet consultation recommended
              </h2>
              <p className="text-ink-soft leading-relaxed">
                {rawData.vet_consultation_reason ||
                  'Please consult your veterinarian before making major diet changes for this pet.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Meal schedule */}
      {plan.meal_schedule && plan.meal_schedule.length > 0 && (
        <div className="bg-card rounded-2xl border border-cream-300/60 p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-ink mb-5 flex items-center gap-2">
            <Clock className="w-5 h-5 text-forest-600" />
            Daily meal schedule
          </h2>
          <div className="space-y-3">
            {plan.meal_schedule.map((meal: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 bg-cream-100 rounded-xl"
              >
                <div className="font-display text-lg font-bold text-forest-600 tabular-nums w-20">
                  {meal.time}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-ink">{meal.meal}</div>
                  <div className="text-sm text-ink-mute mt-0.5">
                    <span className="tabular-nums">{meal.portion_cups} cups</span>
                    {meal.calories && <span> · {meal.calories} kcal</span>}
                  </div>
                  {meal.notes && (
                    <div className="text-xs text-ink-mute mt-1">{meal.notes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended foods */}
      {plan.recommended_foods && plan.recommended_foods.length > 0 && (
        <div className="bg-card rounded-2xl border border-cream-300/60 p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-ink mb-4 flex items-center gap-2">
            <Apple className="w-5 h-5 text-forest-600" />
            Recommended food types
          </h2>
          <div className="space-y-4">
            {plan.recommended_foods.map((food: any, i: number) => (
              <div key={i}>
                <h3 className="font-semibold text-ink mb-1">{food.category}</h3>
                {food.examples && (
                  <div className="text-sm text-ink-soft mb-1">
                    Examples: {food.examples.join(', ')}
                  </div>
                )}
                <p className="text-sm text-ink-mute">{food.why}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Treats budget */}
      <div className="bg-card rounded-2xl border border-cream-300/60 p-6 mb-6">
        <h2 className="font-display text-xl font-semibold text-ink mb-2">
          Treats
        </h2>
        <p className="text-ink-soft mb-3">
          Keep treats to{' '}
          <strong className="text-ink tabular-nums">{treatsBudget} kcal/day</strong> (~10% of total).
        </p>
        {rawData.approved_treats && rawData.approved_treats.length > 0 && (
          <ul className="space-y-1 text-sm text-ink-soft">
            {rawData.approved_treats.map((t: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-forest-500">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Avoid foods */}
      {plan.avoid_foods && plan.avoid_foods.length > 0 && (
        <div className="bg-red-50 rounded-2xl border border-red-200/60 p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-ink mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-urgency-red" />
            Never feed
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {plan.avoid_foods.map((food: string, i: number) => (
              <div key={i} className="text-sm text-ink-soft flex items-start gap-2">
                <span className="text-urgency-red">×</span>
                <span>{food}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transition plan */}
      {plan.notes && (
        <div className="bg-card rounded-2xl border border-cream-300/60 p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-ink mb-3">
            How to transition diets
          </h2>
          <p className="text-ink-soft leading-relaxed whitespace-pre-line">
            {plan.notes}
          </p>
        </div>
      )}

      {/* Monitoring tips */}
      {rawData.monitoring_tips && rawData.monitoring_tips.length > 0 && (
        <div className="bg-card rounded-2xl border border-cream-300/60 p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-ink mb-3">
            What to monitor
          </h2>
          <ul className="space-y-2">
            {rawData.monitoring_tips.map((tip: string, i: number) => (
              <li key={i} className="text-sm text-ink-soft flex items-start gap-2">
                <span className="text-forest-500 mt-1">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-cream-200/60 rounded-xl p-4 text-sm text-ink-soft mb-6">
        <p>
          <strong className="text-ink">Disclaimer:</strong> AI-generated guidance based on general
          principles. Not a substitute for personalized advice from your
          veterinarian or a board-certified veterinary nutritionist (DACVN).
        </p>
      </div>

      <Button asChild variant="outline" className="w-full">
        <Link href="/nutrition/new">Create another plan</Link>
      </Button>
    </div>
  )
}
