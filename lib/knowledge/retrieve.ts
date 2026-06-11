/**
 * Retrieval: turn a free-text clinical query into grounding passages from the
 * veterinary knowledge base.
 *
 * Always fails soft — if embeddings aren't configured, the base is empty, or
 * anything errors, it returns [] so assessments still run (just ungrounded).
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { embedQuery, isEmbeddingConfigured } from './embeddings'
import type { RetrievedPassage } from './types'

export async function retrieveKnowledge(
  query: string,
  opts: { k?: number; minSimilarity?: number } = {}
): Promise<RetrievedPassage[]> {
  if (!isEmbeddingConfigured() || !query.trim()) return []

  try {
    const embedding = await embedQuery(query)
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.rpc('match_knowledge_chunks', {
      query_embedding: JSON.stringify(embedding),
      match_count: opts.k ?? 6,
      // multilingual-e5 has a high similarity baseline (~0.78); 0.82 keeps only
      // genuinely on-topic clinical passages out of the injected context.
      min_similarity: opts.minSimilarity ?? 0.82,
    })
    if (error) {
      console.error('Knowledge retrieval RPC error:', error.message)
      return []
    }
    return (data || []).map((r: any): RetrievedPassage => ({
      content: r.content,
      similarity: r.similarity,
      title: r.title,
      url: r.url,
      authors: r.authors,
      publishedAt: r.published_at,
      license: r.license,
    }))
  } catch (err: any) {
    console.error('Knowledge retrieval failed:', err.message)
    return []
  }
}

/**
 * Format retrieved passages into a compact, citable context block for the
 * system/user prompt. Returns '' when there's nothing to add.
 */
export function formatKnowledgeContext(passages: RetrievedPassage[]): string {
  if (passages.length === 0) return ''
  const blocks = passages.map((p, i) => {
    const cite = [p.title, p.authors?.slice(0, 3).join(', '), p.publishedAt?.slice(0, 4)]
      .filter(Boolean)
      .join(' — ')
    return `[${i + 1}] ${cite}${p.url ? `\n${p.url}` : ''}\n${p.content.trim()}`
  })
  return blocks.join('\n\n---\n\n')
}
