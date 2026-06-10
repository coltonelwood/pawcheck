import Anthropic from '@anthropic-ai/sdk'

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

export async function generateStructuredJson<T>(params: {
  systemPrompt: string
  userPrompt: string
  validator: (parsed: any) => asserts parsed is T
  maxTokens?: number
}): Promise<{ result: T; rawResponse: any; processingTimeMs: number }> {
  const startTime = Date.now()

  const response = await getAnthropic().messages.create({
    model: 'claude-opus-4-7',
    max_tokens: params.maxTokens || 3000,
    system: params.systemPrompt,
    messages: [{ role: 'user', content: params.userPrompt }],
  })

  const processingTimeMs = Date.now() - startTime

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  const cleaned = textBlock.text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim()

  let parsed: T
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    console.error('Failed to parse JSON:', textBlock.text)
    throw new Error('AI response was not valid JSON. Please try again.')
  }

  params.validator(parsed)
  return { result: parsed, rawResponse: response, processingTimeMs }
}
