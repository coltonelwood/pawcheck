import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function generateStructuredJson<T>(params: {
  systemPrompt: string
  userPrompt: string
  validator: (parsed: any) => asserts parsed is T
  maxTokens?: number
}): Promise<{ result: T; rawResponse: any; processingTimeMs: number }> {
  const startTime = Date.now()

  const response = await anthropic.messages.create({
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
