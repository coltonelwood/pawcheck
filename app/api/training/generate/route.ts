import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateStructuredJson } from '@/lib/ai'
import { checkRateLimit } from '@/lib/rate-limit'
import { checkIpRateLimit } from '@/lib/ip-rate-limit'
import { retrieveKnowledge, formatKnowledgeContext } from '@/lib/knowledge/retrieve'
import {
  TRAINING_SYSTEM_PROMPT,
  buildTrainingPrompt,
  TrainingPlanResult,
} from '@/lib/prompts-training'
import { z } from 'zod'

export const maxDuration = 60

const RequestSchema = z.object({
  pet_id: z.string().uuid(),
  behavior_issue: z.string().min(10).max(2000),
  goal: z.string().max(500).optional(),
  context: z.string().max(2000).optional(),
  duration_weeks: z.number().min(2).max(16).optional(),
})

function validateTrainingPlan(p: any): asserts p is TrainingPlanResult {
  const required = [
    'plan_title',
    'plan_summary',
    'duration_weeks',
    'weekly_milestones',
    'daily_exercises',
    'reinforcement_tips',
    'red_flags',
    'professional_referral_recommended',
  ]
  for (const f of required) {
    if (!(f in p)) throw new Error(`Missing field: ${f}`)
  }
  if (!Array.isArray(p.weekly_milestones)) throw new Error('weekly_milestones must be array')
  if (!Array.isArray(p.daily_exercises)) throw new Error('daily_exercises must be array')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ipRl = await checkIpRateLimit(request, 'training')
    if (!ipRl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests from your network. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipRl.retry_after_seconds ?? 3600) } }
      )
    }

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

    const rl = await checkRateLimit(supabase, user.id, 'training')
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'Daily plan limit reached. Try again tomorrow.',
          retry_after_seconds: rl.retry_after_seconds,
        },
        { status: 429, headers: { 'Retry-After': String(rl.retry_after_seconds ?? 86400) } }
      )
    }

    // Get pet (verify ownership)
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, name, species, breed, date_of_birth, weight_lbs')
      .eq('id', input.pet_id)
      .eq('user_id', user.id)
      .single()

    if (petError || !pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    }

    const ageYears = pet.date_of_birth
      ? Math.round(
          ((new Date().getTime() - new Date(pet.date_of_birth).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25)) *
            10
        ) / 10
      : null

    const userPrompt = buildTrainingPrompt({
      pet: {
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        age_years: ageYears,
        weight_lbs: pet.weight_lbs,
      },
      behavior_issue: input.behavior_issue,
      goal: input.goal,
      context: input.context,
      duration_weeks: input.duration_weeks,
    })

    // Ground the plan in retrieved behavioural-veterinary literature (fails soft).
    const passages = await retrieveKnowledge(
      [pet.species, pet.breed, input.behavior_issue, input.goal].filter(Boolean).join(' '),
      { k: 5 }
    )

    const { result, rawResponse } = await generateStructuredJson<TrainingPlanResult>({
      systemPrompt: TRAINING_SYSTEM_PROMPT,
      userPrompt,
      validator: validateTrainingPlan,
      knowledgeContext: formatKnowledgeContext(passages) || undefined,
    })

    // Save plan
    const { data: plan, error: insertError } = await supabase
      .from('training_plans')
      .insert({
        user_id: user.id,
        pet_id: input.pet_id,
        behavior_issue: input.behavior_issue,
        goal: input.goal || null,
        context: input.context || null,
        duration_weeks: result.duration_weeks,
        plan_title: result.plan_title,
        plan_summary: result.plan_summary,
        weekly_milestones: result.weekly_milestones,
        daily_exercises: result.daily_exercises,
        reinforcement_tips: result.reinforcement_tips,
        red_flags: result.red_flags,
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
    console.error('Training generate error:', error)
    return NextResponse.json(
      { error: error.message || 'Generation failed' },
      { status: 500 }
    )
  }
}
