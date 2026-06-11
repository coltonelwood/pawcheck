/**
 * POST /api/notifications/expo-token  - Register/refresh a mobile push token
 * DELETE /api/notifications/expo-token - Unregister current token
 *
 * Mobile apps call this after expo-notifications.getExpoPushTokenAsync().
 * Tokens look like: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { token, platform, device_name } = body
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }
  // Basic shape validation
  if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
    return NextResponse.json({ error: 'Invalid Expo token format' }, { status: 400 })
  }

  // Upsert by token (same token = same physical device)
  const { error } = await supabase
    .from('expo_push_tokens')
    .upsert(
      {
        user_id: user.id,
        token,
        platform: platform ?? null,
        device_name: device_name ?? null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'token' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also flag push enabled on profile for UI
  await supabase
    .from('profiles')
    .update({ notify_push_enabled: true })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const specificToken = searchParams.get('token')

  if (specificToken) {
    await supabase
      .from('expo_push_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('token', specificToken)
  } else {
    await supabase.from('expo_push_tokens').delete().eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
