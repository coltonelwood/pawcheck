import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Apple, Plus, ChevronRight } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

export default async function NutritionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: plans } = await supabase
    .from('nutrition_plans')
    .select('id, daily_calories, goal, activity_level, created_at, pet:pets(name, species)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="container max-w-4xl py-8 lg:py-12">
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink leading-tight">
            Nutrition plans
          </h1>
          <p className="mt-2 text-ink-mute">
            AAFCO-aligned feeding guidance based on your pet's profile.
          </p>
        </div>
        <Button asChild variant="accent">
          <Link href="/nutrition/new">
            <Plus className="w-4 h-4" />
            New plan
          </Link>
        </Button>
      </div>

      {!plans || plans.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-cream-300 p-12 text-center">
          <Apple className="w-12 h-12 mx-auto text-ink-mute mb-3" strokeWidth={1.5} />
          <p className="text-ink-mute mb-4">No nutrition plans yet</p>
          <Button asChild variant="default">
            <Link href="/nutrition/new">Create your first plan</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan: any) => (
            <Link
              key={plan.id}
              href={`/nutrition/${plan.id}`}
              className="block bg-card rounded-xl border border-cream-300/60 p-5 hover:border-forest-600/30 transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg font-semibold text-ink mb-1">
                    {plan.pet?.name}'s plan
                  </h3>
                  <div className="text-sm text-ink-soft mb-2 capitalize">
                    {plan.goal.replace('_', ' ')} · {plan.activity_level.replace('_', ' ')} activity
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-mute">
                    <span className="tabular-nums font-medium">{plan.daily_calories} kcal/day</span>
                    <span>•</span>
                    <span>{formatRelativeTime(plan.created_at)}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-ink-mute" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
