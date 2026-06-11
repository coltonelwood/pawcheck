import { NextRequest, NextResponse } from 'next/server'
import { checkIpRateLimit } from '@/lib/ip-rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Per-IP throttle the login/signup screens call before attempting auth, to
 * blunt credential-stuffing through the app's own forms. Fails closed.
 *
 * NOTE: the authoritative per-IP auth limit is Supabase GoTrue's built-in rate
 * limiting (configurable in the dashboard) plus (recommended) the Vercel WAF —
 * this guard is defense-in-depth for traffic that comes through our UI.
 */
export async function POST(request: NextRequest) {
  const rl = await checkIpRateLimit(request, 'auth')
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts from your network. Please wait and try again.' },
      { status: 429, headers: { 'Retry-After': String(rl.retry_after_seconds ?? 3600) } }
    )
  }
  return NextResponse.json({ ok: true })
}
