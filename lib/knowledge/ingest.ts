/**
 * Ingestion pipeline.
 *
 *   crawl:   discover documents from each enabled source -> upsert (dedup by hash)
 *   process: chunk + embed any documents still pending -> store vectors
 *
 * Both are designed to run in short, bounded batches so they fit comfortably
 * inside serverless function timeouts; the scheduler calls them repeatedly.
 */

import { createHash } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getConnector } from './sources'
import { chunkText } from './chunk'
import { embedDocuments, isEmbeddingConfigured } from './embeddings'

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

export interface CrawlResult {
  source: string
  fetched: number
  inserted: number
  updated: number
  unchanged: number
  error?: string
}

/** Discover documents from every enabled source and upsert them (status='discovered'). */
export async function crawlAllSources(opts: { perSource?: number } = {}): Promise<CrawlResult[]> {
  const perSource = opts.perSource ?? 25
  const supabase = createServiceRoleClient()

  const { data: sources, error } = await supabase
    .from('knowledge_sources')
    .select('id, key, config')
    .eq('enabled', true)
  if (error) throw new Error(`Failed to load sources: ${error.message}`)

  const results: CrawlResult[] = []

  for (const source of sources || []) {
    const connector = getConnector(source.key)
    if (!connector) {
      results.push({ source: source.key, fetched: 0, inserted: 0, updated: 0, unchanged: 0, error: 'no connector' })
      continue
    }

    const r: CrawlResult = { source: source.key, fetched: 0, inserted: 0, updated: 0, unchanged: 0 }
    try {
      const docs = await connector.fetchDocuments(source.config || {}, { limit: perSource })
      r.fetched = docs.length

      if (docs.length > 0) {
        const ids = docs.map((d) => d.externalId)
        const { data: existing } = await supabase
          .from('knowledge_documents')
          .select('id, external_id, content_hash')
          .eq('source_id', source.id)
          .in('external_id', ids)
        const byId = new Map((existing || []).map((e) => [e.external_id, e]))

        for (const doc of docs) {
          const hash = sha256(doc.content)
          const prior = byId.get(doc.externalId)
          const row = {
            source_id: source.id,
            external_id: doc.externalId,
            title: doc.title,
            url: doc.url ?? null,
            authors: doc.authors ?? null,
            license: doc.license ?? null,
            published_at: doc.publishedAt ?? null,
            content: doc.content,
            content_hash: hash,
            status: 'discovered',
            error: null,
            updated_at: new Date().toISOString(),
          }

          if (!prior) {
            await supabase.from('knowledge_documents').insert(row)
            r.inserted++
          } else if (prior.content_hash !== hash) {
            // content changed -> re-ingest: drop stale chunks, reset status
            await supabase.from('knowledge_chunks').delete().eq('document_id', prior.id)
            await supabase.from('knowledge_documents').update(row).eq('id', prior.id)
            r.updated++
          } else {
            r.unchanged++
          }
        }
      }

      await supabase
        .from('knowledge_sources')
        .update({ last_crawled_at: new Date().toISOString() })
        .eq('id', source.id)
    } catch (err: any) {
      r.error = err.message
    }
    results.push(r)
  }

  return results
}

export interface ProcessResult {
  documentsProcessed: number
  chunksEmbedded: number
  errors: number
}

/** Chunk + embed a batch of pending documents. */
export async function processPendingDocuments(opts: { maxDocs?: number } = {}): Promise<ProcessResult> {
  const maxDocs = opts.maxDocs ?? 10
  const out: ProcessResult = { documentsProcessed: 0, chunksEmbedded: 0, errors: 0 }

  if (!isEmbeddingConfigured()) {
    throw new Error('VOYAGE_API_KEY is not configured — cannot embed')
  }

  // Preflight: verify the embedding API works before touching any documents.
  // A bad/placeholder key aborts here so documents stay 'discovered' (re-tryable)
  // instead of being individually marked 'error'.
  await embedDocuments(['preflight'])

  const supabase = createServiceRoleClient()
  const { data: docs, error } = await supabase
    .from('knowledge_documents')
    .select('id, content')
    .eq('status', 'discovered')
    .limit(maxDocs)
  if (error) throw new Error(`Failed to load pending docs: ${error.message}`)

  for (const doc of docs || []) {
    try {
      const chunks = chunkText(doc.content)
      if (chunks.length === 0) {
        await supabase.from('knowledge_documents').update({ status: 'embedded' }).eq('id', doc.id)
        out.documentsProcessed++
        continue
      }

      const vectors = await embedDocuments(chunks.map((c) => c.content))
      // Replace any prior chunks for idempotency, then insert fresh ones.
      await supabase.from('knowledge_chunks').delete().eq('document_id', doc.id)
      const rows = chunks.map((c, i) => ({
        document_id: doc.id,
        chunk_index: c.index,
        content: c.content,
        token_count: Math.round(c.content.length / 4),
        // pgvector accepts the bracketed text form, which equals JSON of a number[]
        embedding: JSON.stringify(vectors[i]),
      }))
      const { error: insErr } = await supabase.from('knowledge_chunks').insert(rows)
      if (insErr) throw new Error(insErr.message)

      await supabase.from('knowledge_documents').update({ status: 'embedded' }).eq('id', doc.id)
      out.documentsProcessed++
      out.chunksEmbedded += rows.length
    } catch (err: any) {
      out.errors++
      await supabase
        .from('knowledge_documents')
        .update({ status: 'error', error: String(err.message).slice(0, 500) })
        .eq('id', doc.id)
    }
  }

  return out
}
