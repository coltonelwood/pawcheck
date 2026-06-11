import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isEmbeddingConfigured } from '@/lib/knowledge/embeddings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Corpus health snapshot. Protected by CRON_SECRET.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const count = async (table: string, filter?: [string, string]) => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true })
    if (filter) q = q.eq(filter[0], filter[1])
    const { count: c } = await q
    return c ?? 0
  }

  const [sources, docsTotal, docsEmbedded, docsPending, docsError, chunks] = await Promise.all([
    count('knowledge_sources'),
    count('knowledge_documents'),
    count('knowledge_documents', ['status', 'embedded']),
    count('knowledge_documents', ['status', 'discovered']),
    count('knowledge_documents', ['status', 'error']),
    count('knowledge_chunks'),
  ])

  const { data: srcRows } = await supabase
    .from('knowledge_sources')
    .select('key, enabled, last_crawled_at')
    .order('key')

  return NextResponse.json({
    embeddingConfigured: isEmbeddingConfigured(),
    sources,
    documents: { total: docsTotal, embedded: docsEmbedded, pending: docsPending, error: docsError },
    chunks,
    sourceDetail: srcRows || [],
  })
}
