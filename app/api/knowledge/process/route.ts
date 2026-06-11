import { NextRequest, NextResponse } from 'next/server'
import { processPendingDocuments } from '@/lib/knowledge/ingest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Chunks + embeds a batch of pending documents.
// Protected by CRON_SECRET. The scheduler calls this repeatedly to drain the queue.
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

  const maxDocs = Number(new URL(request.url).searchParams.get('maxDocs')) || 10

  try {
    const result = await processPendingDocuments({ maxDocs })
    return NextResponse.json({ ok: true, ...result })
  } catch (error: any) {
    console.error('Knowledge process error:', error)
    return NextResponse.json({ error: error.message || 'process failed' }, { status: 500 })
  }
}
