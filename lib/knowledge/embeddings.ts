/**
 * Pinecone hosted embeddings client (Pinecone Inference API).
 *
 * Uses `multilingual-e5-large` (1024-dim) which matches the vector(1024) column
 * in knowledge_chunks — no schema change. e5 models distinguish passage vs query
 * inputs, which we map below.
 *
 * Lazy-read key: a missing PINECONE_API_KEY never participates in `next build`,
 * and retrieval degrades gracefully (returns no passages) rather than crashing.
 */

const PINECONE_EMBED_URL = 'https://api.pinecone.io/embed'
const MODEL = process.env.PINECONE_EMBED_MODEL || 'multilingual-e5-large'
const API_VERSION = '2025-01'
export const EMBED_DIM = 1024
/** Pinecone inference allows up to 96 inputs per request for e5 models. */
const MAX_BATCH = 96

export function isEmbeddingConfigured(): boolean {
  const k = process.env.PINECONE_API_KEY
  // Treat the placeholder as not-configured so retrieval/embedding fail soft.
  return !!k && !k.startsWith('TODO_')
}

function getApiKey(): string {
  const key = process.env.PINECONE_API_KEY
  if (!key) throw new Error('PINECONE_API_KEY is not configured')
  return key
}

async function embedBatch(
  texts: string[],
  inputType: 'passage' | 'query'
): Promise<number[][]> {
  const res = await fetch(PINECONE_EMBED_URL, {
    method: 'POST',
    headers: {
      'Api-Key': getApiKey(),
      'Content-Type': 'application/json',
      'X-Pinecone-API-Version': API_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      parameters: { input_type: inputType, truncate: 'END' },
      inputs: texts.map((text) => ({ text })),
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Pinecone embeddings failed (${res.status}): ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  // Response: { data: [{ values: number[] }, ...] } in input order.
  return (data.data as Array<{ values: number[] }>).map((d) => d.values)
}

/** Embed one or more passages for storage. Batches transparently. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    out.push(...(await embedBatch(texts.slice(i, i + MAX_BATCH), 'passage')))
  }
  return out
}

/** Embed a single search query for retrieval. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedBatch([text], 'query')
  return vec
}
