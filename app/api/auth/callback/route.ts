import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Only allow same-origin relative paths to prevent open-redirect abuse.
  // A valid target is a single leading slash followed by a non-slash char.
  const rawNext = searchParams.get('next') ?? '/dashboard'
  const next = /^\/(?!\/)[A-Za-z0-9/_\-?=&.%#]*$/.test(rawNext) ? rawNext : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
