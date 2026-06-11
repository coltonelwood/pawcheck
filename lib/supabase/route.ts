import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Resolve the authenticated user + an RLS-scoped Supabase client for an API
 * route, supporting BOTH transports:
 *   - Web (same-origin fetch): cookie session.
 *   - Mobile (Expo): `Authorization: Bearer <access_token>`.
 *
 * The web app sends cookies automatically; the mobile app sends a bearer token.
 * When a bearer token is present we both validate it (getUser(token)) and set it
 * as the client's Authorization header so PostgREST/RLS run as that user.
 */
export async function getRouteContext(request: Request) {
  const cookieStore = await cookies()
  const authHeader = request.headers.get('authorization') || ''
  const token = /^bearer\s+/i.test(authHeader) ? authHeader.replace(/^bearer\s+/i, '') : null

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
      ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
    }
  )

  const {
    data: { user },
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser()

  return { supabase, user }
}
