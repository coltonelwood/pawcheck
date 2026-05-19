import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const CreateSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10).max(10000),
  category: z.enum(['general', 'health', 'training', 'nutrition', 'success_story', 'question']),
  photo_url: z.string().url().optional().nullable(),
  pet_id: z.string().uuid().optional().nullable(),
  linked_query_id: z.string().uuid().optional().nullable(),
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const validation = CreateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: validation.error.format() },
      { status: 400 }
    )
  }

  const rl = await checkRateLimit(supabase, user.id, 'post')
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: 'Daily post limit reached. Try again tomorrow.',
        retry_after_seconds: rl.retry_after_seconds,
      },
      { status: 429, headers: { 'Retry-After': String(rl.retry_after_seconds ?? 86400) } }
    )
  }

  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      user_id: user.id,
      ...validation.data,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Post create error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ post_id: data.id })
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
