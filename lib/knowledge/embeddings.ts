/**
 * Voyage AI embeddings client.
 *
 * Voyage is Anthropic's recommended embeddings partner. We use `voyage-3.5`
 * (1024-dim) which matches the vector(1024) column in knowledge_chunks.
 *
 * Lazy-initialised: a missing VOYAGE_API_KEY never participates in `next build`,
 * and retrieval degrades gracefully (returns no passages) rather than crashing.
 */

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings'
const MODEL = process.env.VOYAGE_EMBED_MODEL || 'voyage-3.5'
export const EMBED_DIM = 1024
/** Voyage allows up to 128 inputs per request. */
const MAX_BATCH = 128

export function isEmbeddingConfigured(): boolean {
  return !!process.env.VOYAGE_API_KEY
}

function getApiKey(): string {
  const key = process.env.VOYAGE_API_KEY
  if (!key) throw new Error('VOYAGE_API_KEY is not configured')
  return key
}

async function embedBatch(
  texts: string[],
  inputType: 'document' | 'query'
): Promise<number[][]> {
  const res = await fetch(VOYAGE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model: MODEL,
      input_type: inputType,
      output_dimension: EMBED_DIM,
      truncation: true,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Voyage embeddings failed (${res.status}): ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  // Voyage returns data sorted by index; sort defensively to be safe.
  return (data.data as Array<{ embedding: number[]; index: number }>)
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding)
}

/** Embed one or more passages for storage. Batches transparently. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    out.push(...(await embedBatch(texts.slice(i, i + MAX_BATCH), 'document')))
  }
  return out
}

/** Embed a single search query for retrieval. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedBatch([text], 'query')
  return vec
}
