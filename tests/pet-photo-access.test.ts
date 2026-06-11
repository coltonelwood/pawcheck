import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { petPhotoPath } from '@/lib/storage'

// Unit: the path extractor (security-relevant — drives what gets signed).
describe('petPhotoPath', () => {
  it('returns a raw path unchanged', () => {
    expect(petPhotoPath('uid-1/123.jpg')).toBe('uid-1/123.jpg')
  })
  it('extracts the path from a legacy public URL', () => {
    expect(
      petPhotoPath('https://x.supabase.co/storage/v1/object/public/pet-photos/uid-1/123.jpg')
    ).toBe('uid-1/123.jpg')
  })
  it('rejects a non-pet-photos URL', () => {
    expect(petPhotoPath('https://evil.com/uid-1/123.jpg')).toBeNull()
  })
})

// Integration: against the live project. Skipped unless creds are in the env
// (so CI stays green and no secrets are committed). Run locally with
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY exported.
const URL = process.env.SUPABASE_URL
const ANON = process.env.SUPABASE_ANON_KEY
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY
const run = URL && ANON && SR ? describe : describe.skip

run('private pet-photos bucket (live)', () => {
  it('blocks a raw/unauthenticated storage URL but allows the owner via signed URL', async () => {
    const admin = createClient(URL!, SR!, { auth: { persistSession: false } })
    const email = `photo-test-${Math.floor(Date.now())}@example.com`
    const password = 'Test-Passw0rd-123!'
    const { data: created } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    const uid = created.user!.id
    const path = `${uid}/test.jpg`

    try {
      // Upload a tiny object as the owner's folder (service role).
      await admin.storage.from('pet-photos').upload(path, new Uint8Array([1, 2, 3]), {
        contentType: 'image/jpeg',
        upsert: true,
      })

      // 1) Raw public URL must NOT work (bucket is private).
      const publicUrl = `${URL}/storage/v1/object/public/pet-photos/${path}`
      const rawRes = await fetch(publicUrl)
      expect(rawRes.ok).toBe(false)
      expect(rawRes.status).toBeGreaterThanOrEqual(400)

      // 2) Owner-scoped signed URL MUST work.
      const userClient = createClient(URL!, ANON!, { auth: { persistSession: false } })
      await userClient.auth.signInWithPassword({ email, password })
      const { data: signed } = await userClient.storage
        .from('pet-photos')
        .createSignedUrl(path, 60)
      expect(signed?.signedUrl).toBeTruthy()
      const signedRes = await fetch(signed!.signedUrl)
      expect(signedRes.ok).toBe(true)
    } finally {
      await admin.storage.from('pet-photos').remove([path])
      await admin.auth.admin.deleteUser(uid)
    }
  }, 30000)
})
