import { describe, it, expect } from 'vitest'

// Integration: webhook outcome -> entitlement -> gated endpoint access -> cancel.
// Skipped unless creds are in the env (no secrets committed; CI stays green).
// Run locally with SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.
const URL = process.env.SUPABASE_URL
const ANON = process.env.SUPABASE_ANON_KEY
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY
const API = process.env.PAWCHECK_APP_URL || 'https://pawcheck-web.vercel.app'
const run = URL && ANON && SR ? describe : describe.skip

async function j(method: string, url: string, headers: Record<string, string>, body?: unknown) {
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  return res.status
}

run('subscription entitlement loop (live)', () => {
  it('free is gated, active is entitled, cancel downgrades — via mobile bearer auth', async () => {
    const admin = (path: string) => `${URL}${path}`
    const srH = { apikey: SR!, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' }
    const email = `entl-${Math.floor(performance.now())}-${Math.random().toString(36).slice(2, 8)}@example.com`
    const password = 'Test-Passw0rd-123!'

    const created = await fetch(admin('/auth/v1/admin/users'), {
      method: 'POST', headers: srH,
      body: JSON.stringify({ email, password, email_confirm: true }),
    }).then((r) => r.json())
    const uid = created.id

    try {
      const signin = await fetch(admin('/auth/v1/token?grant_type=password'), {
        method: 'POST', headers: { apikey: ANON!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then((r) => r.json())
      const H = { Authorization: `Bearer ${signin.access_token}`, 'Content-Type': 'application/json' }
      const body = { pet_id: '00000000-0000-0000-0000-000000000000', behavior_issue: 'my dog barks at strangers a lot' }
      const setSub = (s: string) =>
        fetch(admin(`/rest/v1/profiles?id=eq.${uid}`), { method: 'PATCH', headers: srH, body: JSON.stringify({ subscription_status: s }) })

      // Mobile bearer auth must be recognized (not 401).
      expect(await j('POST', `${API}/api/analyze`, H, {})).not.toBe(401)

      // Free -> premium gate (402).
      expect(await j('POST', `${API}/api/training/generate`, H, body)).toBe(402)

      // Webhook outcome (active) -> past the gate (not 402).
      await setSub('active')
      expect(await j('POST', `${API}/api/training/generate`, H, body)).not.toBe(402)

      // Cancellation -> downgraded again (402).
      await setSub('canceled')
      expect(await j('POST', `${API}/api/training/generate`, H, body)).toBe(402)
    } finally {
      await fetch(admin(`/auth/v1/admin/users/${uid}`), { method: 'DELETE', headers: srH })
    }
  }, 45000)
})
