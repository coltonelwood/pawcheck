import { describe, it, expect } from 'vitest'
import Stripe from 'stripe'

// The webhook route grants subscription state ONLY from events whose signature
// verifies against STRIPE_WEBHOOK_SECRET (app/api/stripe/webhook/route.ts).
// This exercises that exact primitive — the Stripe SDK verifier the route uses.
const stripe = new Stripe('sk_test_dummy', { apiVersion: '2025-02-24.acacia' })
const SECRET = 'whsec_test_secret_value'

const payload = JSON.stringify({
  id: 'evt_test_1',
  object: 'event',
  type: 'checkout.session.completed',
  data: { object: { id: 'cs_test', client_reference_id: 'user_123' } },
})

describe('Stripe webhook signature verification (money path)', () => {
  it('accepts a correctly-signed payload', () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET })
    const event = stripe.webhooks.constructEvent(payload, header, SECRET)
    expect(event.type).toBe('checkout.session.completed')
  })

  it('rejects a payload signed with the wrong secret', () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET })
    expect(() => stripe.webhooks.constructEvent(payload, header, 'whsec_attacker')).toThrow()
  })

  it('rejects a tampered payload (signature no longer matches)', () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET })
    const tampered = payload.replace('user_123', 'attacker_999')
    expect(() => stripe.webhooks.constructEvent(tampered, header, SECRET)).toThrow()
  })

  it('rejects a missing/garbage signature header', () => {
    expect(() => stripe.webhooks.constructEvent(payload, 't=0,v1=deadbeef', SECRET)).toThrow()
  })
})
