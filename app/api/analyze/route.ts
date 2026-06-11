import { NextRequest, NextResponse } from 'next/server'
import { getRouteContext } from '@/lib/supabase/route'
import { analyzePetPhoto } from '@/lib/claude'
import { checkRateLimit } from '@/lib/rate-limit'
import { checkIpRateLimit } from '@/lib/ip-rate-limit'
import {
  retrieveKnowledge,
  formatKnowledgeContext,
  extractSources,
} from '@/lib/knowledge/retrieve'
import { composeGuidedSummary } from '@/lib/assessment-questions'
import { detectEmergencyIndicators, emergencyFallbackResult } from '@/lib/emergency'
import type { ClarificationRound } from '@/lib/prompts'
import { z } from 'zod'

export const maxDuration = 60 // Allow up to 60s for Claude analysis

const MAX_CLARIFY_ROUNDS = 2

const RequestSchema = z
  .object({
    // Required on an initial assessment; omitted on a clarification continuation
    // (the pet is taken from the existing query).
    pet_id: z.string().uuid().optional(),
    input_method: z.enum(['photo', 'describe', 'guided']).default('photo'),
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
    // --- continuation of an in-progress assessment (clarification round) ---
    query_id: z.string().uuid().optional(),
    clarification_answers: z.record(z.string().max(1000)).nullable().optional(),
    // Owner tapped "that's all I know" — force a best-effort FINAL result.
    force_final: z.boolean().optional(),
  })
  .refine(
    (d) => d.query_id || d.photo_path || (d.description && d.description.trim()) || d.guided,
    { message: 'Provide a photo, a description, or guided answers' }
  )
  // An initial assessment (no query_id) must identify the pet.
  .refine((d) => d.query_id || d.pet_id, { message: 'pet_id is required' })

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getRouteContext(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ipRl = await checkIpRateLimit(request, 'analyze')
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
    const {
      pet_id,
      input_method,
      photo_path,
      description,
      symptoms,
      guided,
      query_id,
      clarification_answers,
      force_final,
    } = validation.data

    if (photo_path && !photo_path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Invalid photo path' }, { status: 400 })
    }

    // Per-round / per-request rate limit (also the per-session cap as rounds reuse it).
    const rl = await checkRateLimit(supabase, user.id, 'analyze')
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.', retry_after_seconds: rl.retry_after_seconds, limit: rl.limit },
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

    // ----- Load (continuation) or create (initial) the assessment record -----
    const isContinuation = !!query_id
    let query: { id: string; pet_id: string; description: string | null; clarification: any; photo_url: string | null }
    let priorRounds: any[] = []

    if (isContinuation) {
      const { data: existing, error: qErr } = await supabase
        .from('queries')
        .select('id, pet_id, description, clarification, photo_url, user_id')
        .eq('id', query_id)
        .eq('user_id', user.id)
        .single()
      if (qErr || !existing) {
        return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
      }
      query = existing as any
      priorRounds = Array.isArray(existing.clarification) ? existing.clarification : []
      // Record the owner's answers to the most-recent (unanswered) round.
      if (priorRounds.length > 0 && clarification_answers) {
        priorRounds[priorRounds.length - 1] = {
          ...priorRounds[priorRounds.length - 1],
          answers: clarification_answers,
          photoAdded: !!photo_path,
        }
      }
    }

    // Verify pet ownership (use the query's pet on continuation).
    const effectivePetId = isContinuation ? query!.pet_id : pet_id
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, name, species, breed, date_of_birth, weight_lbs, known_conditions, current_medications')
      .eq('id', effectivePetId)
      .eq('user_id', user.id)
      .single()
    if (petError || !pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    }

    // Compose the owner's text (original concern, on continuation we keep it).
    const guidedSummary = guided ? composeGuidedSummary(guided) : ''
    const composedDescription = isContinuation
      ? query!.description || ''
      : [guidedSummary, description?.trim()]
          .filter(Boolean)
          .join(guidedSummary && description?.trim() ? '\n\nOwner adds: ' : '')

    // Build the clarification conversation context for the model.
    const rounds: ClarificationRound[] = priorRounds
      .filter((r) => r && r.answers)
      .map((r) => ({
        questions: (r.questions || []).map((q: any) => ({ id: q.id, question: q.question })),
        answers: r.answers,
        photoAdded: !!r.photoAdded,
      }))
    const answeredRounds = rounds.length
    const roundNumber = answeredRounds + 1
    const canClarify = roundNumber <= MAX_CLARIFY_ROUNDS && !force_final

    // Initial call consumes one credit (covers the WHOLE conversation). Continuation does not.
    if (!isContinuation) {
      const { data: allowed, error: creditError } = await supabase.rpc('consume_query_credit', {
        user_uuid: user.id,
      })
      if (creditError) {
        return NextResponse.json({ error: 'Unable to verify quota' }, { status: 500 })
      }
      if (!allowed) {
        return NextResponse.json(
          { error: 'Free query limit reached', requires_upgrade: true },
          { status: 402 }
        )
      }
      const { data: created, error: queryError } = await supabase
        .from('queries')
        .insert({
          user_id: user.id,
          pet_id: pet_id,
          photo_url: photo_path ?? null,
          description: composedDescription || null,
          symptoms: symptoms,
          input_method: input_method,
          structured_symptoms: guided ?? null,
          status: 'processing',
        })
        .select('id, pet_id, description, clarification, photo_url')
        .single()
      if (queryError || !created) {
        await supabase.rpc('refund_query_credit', { user_uuid: user.id })
        return NextResponse.json({ error: 'Failed to create query' }, { status: 500 })
      }
      query = created as any
    }

    const ageYears = pet.date_of_birth
      ? Math.round(
          ((Date.now() - new Date(pet.date_of_birth).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25)) * 10
        ) / 10
      : null

    // Emergency tripwire over the original concern + all owner answers so far.
    const answersText = rounds
      .flatMap((r) => Object.values(r.answers || {}))
      .map((v) => String(v))
      .join(' ')
    const emergencySuspected = detectEmergencyIndicators(
      composedDescription,
      (symptoms || []).join(' '),
      answersText
    )

    // Retrieve grounding passages (fails soft) using the richest available text.
    const retrievalQuery = [pet.species, pet.breed, composedDescription, answersText, ...(symptoms || [])]
      .filter(Boolean)
      .join(' ')
    const passages = await retrieveKnowledge(retrievalQuery, { k: 6 })
    const knowledgeContext = formatKnowledgeContext(passages)
    const sources = extractSources(passages)

    // Mint a signed URL for the photo (initial photo or one added during clarify).
    const activePhotoPath = photo_path || query!.photo_url || null
    let signedPhotoUrl: string | undefined
    if (activePhotoPath) {
      const { data: signed } = await supabase.storage
        .from('pet-photos')
        .createSignedUrl(activePhotoPath, 600)
      if (signed?.signedUrl) signedPhotoUrl = signed.signedUrl
    }

    try {
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
        clarify: { roundNumber, canClarify, emergencySuspected, rounds },
      })

      // ---- CLARIFY branch: model wants more info (and it's allowed + safe) ----
      if (
        result.mode === 'clarify' &&
        canClarify &&
        !emergencySuspected &&
        result.clarification
      ) {
        const newRound = {
          questions: result.clarification.questions || [],
          photo_request: result.clarification.photo_request || null,
          intro: result.clarification.intro || null,
          answers: null,
        }
        // Persist the asked round (replace prior rounds, which now carry answers).
        const persisted = [...priorRounds]
        // If continuation, priorRounds already updated with answers above.
        persisted.push(newRound)
        await supabase
          .from('queries')
          .update({
            status: 'awaiting_clarification',
            clarification: persisted,
            description: composedDescription || null,
            ...(activePhotoPath ? { photo_url: activePhotoPath } : {}),
          })
          .eq('id', query!.id)

        return NextResponse.json({
          query_id: query!.id,
          mode: 'clarify',
          round: roundNumber,
          max_rounds: MAX_CLARIFY_ROUNDS,
          clarification: result.clarification,
        })
      }

      // ---- FINAL branch (or forced final). Emergency override if needed. ----
      const finalResult =
        emergencySuspected && result.mode !== 'final'
          ? { ...emergencyFallbackResult(pet.name) }
          : result
      finalResult.mode = 'final'
      finalResult.sources = sources

      await supabase
        .from('queries')
        .update({
          status: 'complete',
          urgency: finalResult.urgency,
          urgency_label: finalResult.urgency_label,
          description_summary: finalResult.description_summary,
          likely_causes: finalResult.likely_causes,
          recommended_action: finalResult.recommended_action,
          vet_visit: finalResult.vet_visit,
          confidence_score: finalResult.confidence_score,
          red_flags: finalResult.red_flags,
          followup_questions: finalResult.followup_questions,
          sources: sources,
          clarification: priorRounds.length ? priorRounds : null,
          raw_ai_response: rawResponse,
          processing_time_ms: processingTimeMs,
          ...(activePhotoPath ? { photo_url: activePhotoPath } : {}),
          completed_at: new Date().toISOString(),
        })
        .eq('id', query!.id)

      return NextResponse.json({
        query_id: query!.id,
        mode: 'final',
        result: finalResult,
      })
    } catch (aiError: any) {
      // Refund only the initial call (continuation never consumed a credit).
      if (!isContinuation) {
        await supabase.rpc('refund_query_credit', { user_uuid: user.id })
      }
      await supabase
        .from('queries')
        .update({ status: 'failed', error_message: aiError.message || 'AI analysis failed' })
        .eq('id', query!.id)
      console.error('AI analysis error:', aiError)
      return NextResponse.json(
        { error: 'Analysis failed. Please try again or contact support.' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Analyze endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
