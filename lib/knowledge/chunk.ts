/**
 * Lightweight text chunker for embeddings.
 *
 * Splits on paragraph/sentence boundaries into ~target-sized chunks with a
 * small overlap so context isn't lost across boundaries. Abstracts usually
 * fit in a single chunk; full-text documents produce several.
 */

const TARGET_CHARS = 1500 // ~375 tokens, comfortably under Voyage's per-input limit
const OVERLAP_CHARS = 200

export interface TextChunk {
  index: number
  content: string
}

export function chunkText(raw: string): TextChunk[] {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (!text) return []
  if (text.length <= TARGET_CHARS) return [{ index: 0, content: text }]

  // Split into sentences, then greedily pack into target-sized windows.
  const sentences = text.match(/[^.!?]+[.!?]+|\S+$/g) || [text]
  const chunks: TextChunk[] = []
  let current = ''
  let index = 0

  const push = () => {
    const trimmed = current.trim()
    if (trimmed) chunks.push({ index: index++, content: trimmed })
  }

  for (const sentence of sentences) {
    if (current.length + sentence.length > TARGET_CHARS && current.length > 0) {
      push()
      // start next chunk with a tail overlap of the previous one
      current = current.slice(-OVERLAP_CHARS) + ' '
    }
    current += sentence + ' '
  }
  push()

  return chunks
}
