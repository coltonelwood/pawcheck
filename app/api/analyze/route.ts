import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzePetPhoto } from '@/lib/claude'
import { checkRateLimit } from '@/lib/rate-limit'
import { checkIpRateLimit } from '@/lib/ip-rate-limit'
import { retrieveKnowledge, formatKnowledgeContext } from '@/lib/knowledge/retrieve'
import { composeGuidedSummary } from '@/lib/assessment-questions'
import { z } from 'zod'

export const maxDuration = 60 // Allow up to 60s for Claude analysis

const RequestSchema = z
  .object({
    pet_id: z.string().uuid(),
    input_method: z.enum(['photo', 'describe', 'guided']).default('photo'),
    // Storage path within the private pet-photos bucket, e.g. "{uid}/123.jpg".
    photo_path: z.string().min(1).max(500).nullable().optional(),
    description: z.string().max(4000).nullable().optional(),
    symptoms: z.array(z.string().max(200)).max(30).nullable().optional(),
    guided: z
      .object({
        category: z.string().max(50),
        answers: z.record(z.union([z.string().max(500), z.boolean()])),
      })
      .nullable()
      .optional(),
  })
  // Photo-optional: require at least one form of input.
  .refine((d) => d.photo_path || (d.description && d.description.trim()) || d.guided, {
    message: 'Provide a photo, a description, or guided answers',
  })

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Per-IP rate limit (catches abuse across many accounts from one IP).
    const ipRl = await checkIpRateLimit(request, 'analyze')
    if (!ipRl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests from your network. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipRl.retry_after_seconds ?? 3600) } }
      )
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
    const { pet_id, input_method, photo_path, description, symptoms, guided } = validation.data

    // Ensure any uploaded photo lives in the caller's own folder.
    if (photo_path && !photo_path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Invalid photo path' }, { status: 400 })
    }

    // Compose the owner's text from the free-text description and/or guided answers.
    const guidedSummary = guided ? composeGuidedSummary(guided) : ''
    const composedDescription = [guidedSummary, description?.trim()]
      .filter(Boolean)
      .join(guidedSummary && description?.trim() ? '\n\nOwner adds: ' : '')

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

    // Atomically reserve a query credit (free-tier gate, race-safe). Returns
    // false when a non-subscriber has used all free queries. Refunded below if
    // the AI call fails, so users are never charged for a failed assessment.
    const { data: allowed, error: creditError } = await supabase.rpc('consume_query_credit', {
      user_uuid: user.id,
    })
    if (creditError) {
      console.error('consume_query_credit failed:', creditError.message)
      return NextResponse.json({ error: 'Unable to verify quota' }, { status: 500 })
    }
    if (!allowed) {
      return NextResponse.json(
        { error: 'Free query limit reached', requires_upgrade: true },
        { status: 402 }
      )
    }

    // Create the query record (pending status)
    const { data: query, error: queryError } = await supabase
      .from('queries')
      .insert({
        user_id: user.id,
        pet_id: pet_id,
        // photo_url now stores the private-bucket object PATH (or null), not a URL.
        photo_url: photo_path ?? null,
        description: composedDescription || null,
        symptoms: symptoms,
        input_method: input_method,
        structured_symptoms: guided ?? null,
        status: 'processing',
      })
      .select('id')
      .single()

    if (queryError || !query) {
      // Reservation was made but we couldn't record the query — give the credit back.
      await supabase.rpc('refund_query_credit', { user_uuid: user.id })
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

    // Retrieve grounding passages from the veterinary knowledge base (fails soft).
    const retrievalQuery = [
      pet.species,
      pet.breed,
      guided?.category,
      composedDescription,
      ...(symptoms || []),
    ]
      .filter(Boolean)
      .join(' ')
    const passages = await retrieveKnowledge(retrievalQuery, { k: 6 })
    const knowledgeContext = formatKnowledgeContext(passages)

    // Mint a short-lived signed URL for the private photo so Claude can fetch it
    // (only when this assessment actually includes a photo).
    let signedPhotoUrl: string | undefined
    if (photo_path) {
      const { data: signed } = await supabase.storage
        .from('pet-photos')
        .createSignedUrl(photo_path, 600)
      if (!signed?.signedUrl) {
        await supabase.rpc('refund_query_credit', { user_uuid: user.id })
        await supabase.from('queries').update({ status: 'failed', error_message: 'Photo not found' }).eq('id', query.id)
        return NextResponse.json({ error: 'Could not access the uploaded photo' }, { status: 400 })
      }
      signedPhotoUrl = signed.signedUrl
    }

    try {
      // Call Claude (photo optional)
      const { result, rawResponse, processingTimeMs } = await analyzePetPhoto({
        imageUrl: signedPhotoUrl,
        pet: {
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          age_years: ageYears,
          weight_lbs: pet.weight_lbs,
          known_conditions: pet.known_conditions,
          current_medications: pet.current_medications,
        },
        userDescription: composedDescription || undefined,
        symptoms: symptoms || undefined,
        knowledgeContext: knowledgeContext || undefined,
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

      // Credit was already consumed atomically by consume_query_credit above.

      return NextResponse.json({
        query_id: query.id,
        result: result,
      })
    } catch (aiError: any) {
      // AI call failed — refund the reserved credit so the user isn't charged.
      await supabase.rpc('refund_query_credit', { user_uuid: user.id })

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
