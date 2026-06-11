import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Permanently delete the authenticated user's account and all their data.
 * Required by Apple App Store Guideline 5.1.1(v). Works for the web app
 * (cookie session) and the mobile app (Authorization: Bearer <access_token>).
 *
 * Deleting the auth user cascades to profiles/pets/queries/plans/etc. via the
 * `on delete cascade` foreign keys. Any active Stripe subscription is cancelled
 * first (best effort).
 */
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !serviceRole) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  // Resolve the user from a bearer token (mobile) or the cookie session (web).
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  let userId: string | null = null

  if (bearer) {
    const tokenClient = createSupabaseClient(url, anon)
    const { data } = await tokenClient.auth.getUser(bearer)
    userId = data.user?.id ?? null
  } else {
    const cookieStore = await cookies()
    const cookieClient = createServerClient(url, anon, {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    })
    const { data } = await cookieClient.auth.getUser()
    userId = data.user?.id ?? null
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createSupabaseClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Best-effort: cancel an active Stripe subscription before deleting.
  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', userId)
      .single()
    if (profile?.stripe_subscription_id) {
      await getStripe().subscriptions.cancel(profile.stripe_subscription_id)
    }
  } catch (err: any) {
    // Don't block account deletion on Stripe issues; log and continue.
    console.error('Stripe cancel during account deletion failed:', err?.message)
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) {
    console.error('Account deletion failed:', error.message)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
