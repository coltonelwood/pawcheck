import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateStructuredJson } from '@/lib/ai'
import { checkRateLimit } from '@/lib/rate-limit'
import { retrieveKnowledge, formatKnowledgeContext } from '@/lib/knowledge/retrieve'
import {
  NUTRITION_SYSTEM_PROMPT,
  buildNutritionPrompt,
  NutritionPlanResult,
} from '@/lib/prompts-nutrition'
import { z } from 'zod'

export const maxDuration = 60

const RequestSchema = z.object({
  pet_id: z.string().uuid(),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  goal: z.enum(['maintain', 'weight_loss', 'weight_gain', 'muscle', 'puppy_growth', 'senior_support']),
  current_diet: z.string().max(2000).optional(),
  food_preferences: z.string().max(500).optional(),
  allergies: z.array(z.string()).optional(),
})

function validateNutritionPlan(p: any): asserts p is NutritionPlanResult {
  const required = [
    'daily_calories',
    'rer_kcal',
    'meal_schedule',
    'recommended_food_types',
    'avoid_foods',
    'transition_plan',
  ]
  for (const f of required) {
    if (!(f in p)) throw new Error(`Missing field: ${f}`)
  }
  if (!Array.isArray(p.meal_schedule)) throw new Error('meal_schedule must be array')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const validation = RequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }
    const input = validation.data

    // Premium-only feature
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    if (profile?.subscription_status !== 'active') {
      return NextResponse.json(
        { error: 'Premium subscription required', requires_upgrade: true },
        { status: 402 }
      )
    }

    const rl = await checkRateLimit(supabase, user.id, 'nutrition')
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'Daily plan limit reached. Try again tomorrow.',
          retry_after_seconds: rl.retry_after_seconds,
        },
        { status: 429, headers: { 'Retry-After': String(rl.retry_after_seconds ?? 86400) } }
      )
    }

    // Get pet
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select(
        'id, name, species, breed, date_of_birth, weight_lbs, spayed_neutered, known_conditions, current_medications'
      )
      .eq('id', input.pet_id)
      .eq('user_id', user.id)
      .single()

    if (petError || !pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    }

    if (!pet.weight_lbs) {
      return NextResponse.json(
        {
          error: 'Pet weight is required for nutrition calculations. Please update pet profile.',
        },
        { status: 400 }
      )
    }

    const ageYears = pet.date_of_birth
      ? Math.round(
          ((new Date().getTime() - new Date(pet.date_of_birth).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25)) *
            10
        ) / 10
      : null

    const userPrompt = buildNutritionPrompt({
      pet: {
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        age_years: ageYears,
        weight_lbs: pet.weight_lbs,
        spayed_neutered: pet.spayed_neutered,
        known_conditions: pet.known_conditions,
        current_medications: pet.current_medications,
      },
      activity_level: input.activity_level,
      goal: input.goal,
      current_diet: input.current_diet,
      food_preferences: input.food_preferences,
      allergies: input.allergies,
    })

    // Ground the plan in retrieved veterinary-nutrition literature (fails soft).
    const passages = await retrieveKnowledge(
      [pet.species, pet.breed, 'nutrition diet', input.goal, ...(input.allergies || [])]
        .filter(Boolean)
        .join(' '),
      { k: 5 }
    )

    const { result, rawResponse } = await generateStructuredJson<NutritionPlanResult>({
      systemPrompt: NUTRITION_SYSTEM_PROMPT,
      userPrompt,
      validator: validateNutritionPlan,
      knowledgeContext: formatKnowledgeContext(passages) || undefined,
    })

    const { data: plan, error: insertError } = await supabase
      .from('nutrition_plans')
      .insert({
        user_id: user.id,
        pet_id: input.pet_id,
        current_diet: input.current_diet || null,
        activity_level: input.activity_level,
        goal: input.goal,
        food_preferences: input.food_preferences || null,
        allergies: input.allergies || null,
        daily_calories: result.daily_calories,
        protein_grams: result.protein_grams_min,
        fat_grams: result.fat_grams_min,
        meal_schedule: result.meal_schedule,
        recommended_foods: result.recommended_food_types,
        avoid_foods: result.avoid_foods,
        supplements: result.supplements_to_consider,
        notes: result.transition_plan,
        raw_ai_response: rawResponse,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save plan' }, { status: 500 })
    }

    return NextResponse.json({ plan_id: plan.id, result })
  } catch (error: any) {
    console.error('Nutrition generate error:', error)
    return NextResponse.json(
      { error: error.message || 'Generation failed' },
      { status: 500 }
    )
  }
}
