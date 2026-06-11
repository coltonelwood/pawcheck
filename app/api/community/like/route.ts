import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  post_id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const validation = Schema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Check existing
  const { data: existing } = await supabase
    .from('community_likes')
    .select('post_id')
    .eq('post_id', validation.data.post_id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    // Unlike
    await supabase
      .from('community_likes')
      .delete()
      .eq('post_id', validation.data.post_id)
      .eq('user_id', user.id)
    return NextResponse.json({ liked: false })
  } else {
    // Like
    await supabase.from('community_likes').insert({
      post_id: validation.data.post_id,
      user_id: user.id,
    })
    return NextResponse.json({ liked: true })
  }
}
