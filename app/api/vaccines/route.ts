import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateSchema = z.object({
  pet_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  administered_date: z.string().optional(),
  due_date: z.string().optional(),
  veterinarian: z.string().optional(),
  notes: z.string().optional(),
})

const UpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  administered_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  veterinarian: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const validation = CreateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const input = validation.data

  // Verify pet ownership
  const { data: pet } = await supabase
    .from('pets')
    .select('id')
    .eq('id', input.pet_id)
    .eq('user_id', user.id)
    .single()

  if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('vaccines')
    .insert({
      user_id: user.id,
      ...input,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const validation = UpdateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { id, ...updates } = validation.data

  const { data, error } = await supabase
    .from('vaccines')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('vaccines')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
