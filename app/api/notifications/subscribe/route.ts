import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  user_agent: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const validation = SubscribeSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { endpoint, keys, user_agent } = validation.data

  // Upsert subscription
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth_secret: keys.auth,
        user_agent: user_agent || null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Set user opt-in flag
  await supabase
    .from('profiles')
    .update({ notify_push_enabled: true })
    .eq('id', user.id)

  return NextResponse.json({ subscribed: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint')

  if (endpoint) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)
  } else {
    // Remove all
    await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
  }

  await supabase
    .from('profiles')
    .update({ notify_push_enabled: false })
    .eq('id', user.id)

  return NextResponse.json({ unsubscribed: true })
}
