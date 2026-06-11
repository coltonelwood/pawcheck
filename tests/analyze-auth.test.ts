import { describe, it, expect, vi, beforeEach } from 'vitest'

// Control the authenticated user per test via the dual-auth route helper.
let mockUser: { id: string } | null = null
vi.mock('@/lib/supabase/route', () => ({
  getRouteContext: async () => ({ supabase: {}, user: mockUser }),
}))
// IP rate limiter uses the service client; return a low count so it allows through.
vi.mock('@/lib/supabase/server', () => ({
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
  beforeEach(() => {
    mockUser = null
  })

  it('rejects unauthenticated requests with 401 before any AI work', async () => {
    const res = await POST(post({ pet_id: 'x', photo_path: 'u/1.jpg' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('rejects malformed input with 400 for an authenticated user', async () => {
    mockUser = { id: 'user_1' }
    const res = await POST(post({ pet_id: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })
})
