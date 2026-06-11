import Anthropic from '@anthropic-ai/sdk'
import { PET_HEALTH_SYSTEM_PROMPT, buildAnalysisPrompt, AnalysisResult } from './prompts'

// Lazy singleton — constructing the SDK at module scope throws when
// ANTHROPIC_API_KEY is missing, which crashes `next build`.
let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }
  _anthropic = new Anthropic({ apiKey })
  return _anthropic
}

export interface PetContext {
  name: string
  species: string
  breed?: string | null
  age_years?: number | null
  weight_lbs?: number | null
  known_conditions?: string[] | null
  current_medications?: string[] | null
}

export async function analyzePetPhoto(params: {
  imageUrl: string
  pet: PetContext
  userDescription?: string
  symptoms?: string[]
  /** Optional grounding passages from the veterinary knowledge base (RAG). */
  knowledgeContext?: string
}): Promise<{ result: AnalysisResult; rawResponse: any; processingTimeMs: number }> {
  const startTime = Date.now()

  // Fetch the image as base64 (Claude vision requires base64 or URL)
  const imageResponse = await fetch(params.imageUrl)
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
  }
  
  const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
  const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const mediaType = supportedTypes.includes(contentType) ? contentType : 'image/jpeg'
  
  const imageBuffer = await imageResponse.arrayBuffer()
  const base64Image = Buffer.from(imageBuffer).toString('base64')

  let userPrompt = buildAnalysisPrompt(params.pet, params.userDescription, params.symptoms)

  // Ground the assessment in retrieved veterinary literature when available.
  if (params.knowledgeContext) {
    userPrompt +=
      '\n\n---\nRELEVANT VETERINARY LITERATURE (open-access sources, retrieved for this case). ' +
      'Use it to inform your assessment where clinically applicable. Do not fabricate facts or ' +
      'citations beyond what is provided, and never let it override clear visual red flags:\n\n' +
      params.knowledgeContext
  }

  const response = await getAnthropic().messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2000,
    system: PET_HEALTH_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: userPrompt,
          },
        ],
      },
    ],
  })

  const processingTimeMs = Date.now() - startTime

  // Extract text content
  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  // Parse JSON response (Claude should return clean JSON per prompt)
  let parsed: AnalysisResult
  try {
    // Strip any markdown fences if present (defensive)
    const cleaned = textBlock.text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')
      .trim()
    parsed = JSON.parse(cleaned)
  } catch (err) {
    console.error('Failed to parse Claude response:', textBlock.text)
    throw new Error('AI response was not valid JSON. Please try again.')
  }

  // Validate required fields
  validateAnalysisResult(parsed)

  return {
    result: parsed,
    rawResponse: response,
    processingTimeMs,
  }
}

function validateAnalysisResult(result: any): asserts result is AnalysisResult {
  const requiredFields = [
    'urgency',
    'urgency_label',
    'description_summary',
    'likely_causes',
    'recommended_action',
    'vet_visit',
    'confidence_score',
    'red_flags',
    'followup_questions',
    'disclaimer',
  ]

  for (const field of requiredFields) {
    if (!(field in result)) {
      throw new Error(`AI response missing required field: ${field}`)
    }
  }

  if (!['green', 'yellow', 'red'].includes(result.urgency)) {
    throw new Error(`Invalid urgency value: ${result.urgency}`)
  }

  if (
    !['immediate', 'within_24h', 'within_week', 'monitor', 'not_needed'].includes(
      result.vet_visit
    )
  ) {
    throw new Error(`Invalid vet_visit value: ${result.vet_visit}`)
  }

  if (
    typeof result.confidence_score !== 'number' ||
    result.confidence_score < 0 ||
    result.confidence_score > 100
  ) {
    throw new Error(`Invalid confidence_score: ${result.confidence_score}`)
  }

  if (!Array.isArray(result.likely_causes)) {
    throw new Error('likely_causes must be an array')
  }
}
