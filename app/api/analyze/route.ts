import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzePetPhoto } from '@/lib/claude'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

export const maxDuration = 60 // Allow up to 60s for Claude analysis

const RequestSchema = z.object({
  pet_id: z.string().uuid(),
  photo_url: z.string().url(),
  description: z.string().nullable().optional(),
  symptoms: z.array(z.string()).nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request
    const body = await request.json()
    const validation = RequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }
    const { pet_id, photo_url, description, symptoms } = validation.data

    // Check quota
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_status, free_queries_used')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const freeLimit = parseInt(process.env.FREE_QUERY_LIMIT || '3')
    const isSubscribed = profile.subscription_status === 'active'
    const hasFreeQueries = profile.free_queries_used < freeLimit

    if (!isSubscribed && !hasFreeQueries) {
      return NextResponse.json(
        {
          error: 'Free query limit reached',
          requires_upgrade: true,
        },
        { status: 402 }
      )
    }

    // Rate limit (even paid users — protects Anthropic budget)
    const rl = await checkRateLimit(supabase, user.id, 'analyze')
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please slow down.',
          retry_after_seconds: rl.retry_after_seconds,
          limit: rl.limit,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.retry_after_seconds ?? 3600),
            'X-RateLimit-Limit': String(rl.limit),
            'X-RateLimit-Remaining': String(rl.remaining),
          },
        }
      )
    }

    // Verify pet belongs to user
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, name, species, breed, date_of_birth, weight_lbs, known_conditions, current_medications')
      .eq('id', pet_id)
      .eq('user_id', user.id)
      .single()

    if (petError || !pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    }

    // Create the query record (pending status)
    const { data: query, error: queryError } = await supabase
      .from('queries')
      .insert({
        user_id: user.id,
        pet_id: pet_id,
        photo_url: photo_url,
        description: description,
        symptoms: symptoms,
        status: 'processing',
      })
      .select('id')
      .single()

    if (queryError || !query) {
      return NextResponse.json(
        { error: 'Failed to create query' },
        { status: 500 }
      )
    }

    // Calculate pet age
    const ageYears = pet.date_of_birth
      ? Math.round(
          ((new Date().getTime() - new Date(pet.date_of_birth).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25)) *
            10
        ) / 10
      : null

    try {
      // Call Claude
      const { result, rawResponse, processingTimeMs } = await analyzePetPhoto({
        imageUrl: photo_url,
        pet: {
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          age_years: ageYears,
          weight_lbs: pet.weight_lbs,
          known_conditions: pet.known_conditions,
          current_medications: pet.current_medications,
        },
        userDescription: description || undefined,
        symptoms: symptoms || undefined,
      })

      // Update query with results
      await supabase
        .from('queries')
        .update({
          status: 'complete',
          urgency: result.urgency,
          urgency_label: result.urgency_label,
          description_summary: result.description_summary,
          likely_causes: result.likely_causes,
          recommended_action: result.recommended_action,
          vet_visit: result.vet_visit,
          confidence_score: result.confidence_score,
          red_flags: result.red_flags,
          followup_questions: result.followup_questions,
          raw_ai_response: rawResponse,
          processing_time_ms: processingTimeMs,
          completed_at: new Date().toISOString(),
        })
        .eq('id', query.id)

      // Increment usage count
      await supabase.rpc('increment_query_count', { user_uuid: user.id })

      return NextResponse.json({
        query_id: query.id,
        result: result,
      })
    } catch (aiError: any) {
      // Mark query as failed
      await supabase
        .from('queries')
        .update({
          status: 'failed',
          error_message: aiError.message || 'AI analysis failed',
        })
        .eq('id', query.id)

      console.error('AI analysis error:', aiError)
      return NextResponse.json(
        { error: 'Analysis failed. Please try again or contact support.' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Analyze endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
