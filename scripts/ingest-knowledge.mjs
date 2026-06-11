#!/usr/bin/env node
/**
 * On-demand knowledge-base ingestion runner (Part A2).
 *
 * Drives the deployed pipeline: crawl every enabled source (idempotent — dedup
 * by content hash) then drain the embed queue, and print final stats. Safe to
 * re-run; "refresh" is just running it again (changed docs re-embed, unchanged
 * are skipped).
 *
 * Usage (from the pawcheck/ web repo):
 *   CRON_SECRET=... BASE_URL=https://pawcheck-web.vercel.app \
 *   node scripts/ingest-knowledge.mjs [--per-source=100] [--no-crawl]
 */
const BASE = process.env.BASE_URL || 'https://pawcheck-web.vercel.app'
const SECRET = process.env.CRON_SECRET
if (!SECRET) { console.error('Set CRON_SECRET'); process.exit(1) }
const perSource = Number((process.argv.find((a) => a.startsWith('--per-source=')) || '').split('=')[1]) || 100
const noCrawl = process.argv.includes('--no-crawl')
const H = { Authorization: `Bearer ${SECRET}` }

async function post(p) { const r = await fetch(`${BASE}${p}`, { method: 'POST', headers: H }); return r.json() }
async function get(p) { const r = await fetch(`${BASE}${p}`, { headers: H }); return r.json() }

async function main() {
  if (!noCrawl) {
    console.log(`crawling all sources (perSource=${perSource})…`)
    const c = await post(`/api/knowledge/crawl?perSource=${perSource}`)
    console.log('  totals:', JSON.stringify(c.totals))
    for (const r of c.results || []) console.log(`  ${r.source}: fetched ${r.fetched}, inserted ${r.inserted}, updated ${r.updated}${r.error ? ' ERROR ' + r.error : ''}`)
  }
  console.log('embedding pending documents…')
  for (let i = 0; i < 40; i++) {
    const p = await post('/api/knowledge/process?maxDocs=10')
    if (!p || p.documentsProcessed === 0) break
    process.stdout.write(`  +${p.chunksEmbedded} chunks (${p.documentsProcessed} docs)\n`)
  }
  const s = await get('/api/knowledge/stats')
  console.log('\nKB STATS:')
  console.log(`  documents: ${s.documents.embedded}/${s.documents.total} embedded (${s.documents.pending} pending, ${s.documents.error} error)`)
  console.log(`  chunks:    ${s.chunks}`)
  console.log(`  sources:   ${(s.sourceDetail || []).map((x) => x.key + (x.enabled ? '' : '(off)')).join(', ')}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
