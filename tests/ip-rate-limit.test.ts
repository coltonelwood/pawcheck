import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the service client so the helper's consume_ip_rate RPC is controllable.
const rpc = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({ rpc }),
}))

import { checkIpRateLimit, clientIp, IP_LIMITS } from '@/lib/ip-rate-limit'

function req(ip?: string) {
  return new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: ip ? { 'x-forwarded-for': ip } : {},
  })
}

describe('per-IP rate limiting', () => {
  beforeEach(() => rpc.mockReset())

  it('extracts the first x-forwarded-for IP', () => {
    expect(clientIp(req('1.2.3.4, 5.6.7.8'))).toBe('1.2.3.4')
    expect(clientIp(req())).toBe('unknown')
  })

  it('allows while at/under the limit', async () => {
    rpc.mockResolvedValue({ data: IP_LIMITS.analyze.max, error: null })
    const r = await checkIpRateLimit(req('1.2.3.4'), 'analyze')
    expect(r.allowed).toBe(true)
  })

  it('blocks once the limit is exceeded', async () => {
    rpc.mockResolvedValue({ data: IP_LIMITS.analyze.max + 1, error: null })
    const r = await checkIpRateLimit(req('1.2.3.4'), 'analyze')
    expect(r.allowed).toBe(false)
    expect(r.retry_after_seconds).toBeGreaterThan(0)
  })

  it('FAILS CLOSED when the counter RPC errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'db down' } })
    const r = await checkIpRateLimit(req('1.2.3.4'), 'analyze')
    expect(r.allowed).toBe(false)
  })
})
