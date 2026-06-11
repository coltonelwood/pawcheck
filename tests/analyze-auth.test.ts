import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Supabase server module so no real DB/cookies are needed.
// Default: no authenticated user.
const getUser = vi.fn(async () => ({ data: { user: null as any } }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser } }),
  // IP rate limiter uses this; return a low count so it allows through.
  createServiceRoleClient: () => ({ rpc: async () => ({ data: 1, error: null }) }),
}))

import { POST } from '@/app/api/analyze/route'

function post(body: unknown) {
  return new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

describe('/api/analyze auth + paywall (paid AI endpoint)', () => {
  beforeEach(() => getUser.mockResolvedValue({ data: { user: null as any } }))

  it('rejects unauthenticated requests with 401 before any AI work', async () => {
    const res = await POST(post({ pet_id: 'x', photo_url: 'http://x/y.jpg' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
    expect(getUser).toHaveBeenCalled()
  })

  it('rejects malformed input with 400 for an authenticated user', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user_1' } as any } })
    // missing photo_url / bad pet_id -> zod validation fails
    const res = await POST(post({ pet_id: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })
})
