import { NextRequest, NextResponse } from 'next/server'
import { crawlAllSources } from '@/lib/knowledge/ingest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Discovers new documents from every enabled open-access source.
// Protected by CRON_SECRET (Vercel Cron / GitHub Actions send it as a Bearer token).
export async function GET(request: NextRequest) {
  return handle(request)
}
export async function POST(request: NextRequest) {
  return handle(request)
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const perSource = Number(new URL(request.url).searchParams.get('perSource')) || 25

  try {
    const results = await crawlAllSources({ perSource })
    const totals = results.reduce(
      (a, r) => ({
        inserted: a.inserted + r.inserted,
        updated: a.updated + r.updated,
        unchanged: a.unchanged + r.unchanged,
      }),
      { inserted: 0, updated: 0, unchanged: 0 }
    )
    return NextResponse.json({ ok: true, totals, results })
  } catch (error: any) {
    console.error('Knowledge crawl error:', error)
    return NextResponse.json({ error: error.message || 'crawl failed' }, { status: 500 })
  }
}
