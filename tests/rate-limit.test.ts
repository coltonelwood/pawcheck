import { describe, it, expect } from 'vitest'
import { checkRateLimit } from '@/lib/rate-limit'

// A minimal fake Supabase client whose .rpc() returns a controlled result.
function fakeSupabase(result: { data?: unknown; error?: { message: string } | null }) {
  return { rpc: async () => result } as any
}

describe('checkRateLimit (protects the Anthropic budget)', () => {
  it('allows when usage is under the limit', async () => {
    const r = await checkRateLimit(fakeSupabase({ data: 5, error: null }), 'u1', 'analyze')
    expect(r.allowed).toBe(true)
    expect(r.limit).toBe(30)
    expect(r.remaining).toBe(25)
  })

  it('blocks when usage has reached the limit', async () => {
    const r = await checkRateLimit(fakeSupabase({ data: 30, error: null }), 'u1', 'analyze')
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
    expect(r.retry_after_seconds).toBeGreaterThan(0)
  })

  it('FAILS CLOSED when the rate-limit RPC errors (no open wallet)', async () => {
    const r = await checkRateLimit(
      fakeSupabase({ data: null, error: { message: 'db down' } }),
      'u1',
      'analyze'
    )
    expect(r.allowed).toBe(false)
    expect(r.retry_after_seconds).toBeGreaterThan(0)
  })
})
