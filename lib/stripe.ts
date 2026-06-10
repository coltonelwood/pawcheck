import Stripe from 'stripe'

// Lazy singleton — instantiating Stripe at module scope crashes the build
// when STRIPE_SECRET_KEY is absent (e.g. during `next build` env collection,
// or in this deployment where billing runs through App Store IAP, not Stripe).
// Construct it on first use inside a request handler instead.
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  _stripe = new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  })
  return _stripe
}

export const STRIPE_PRICE_IDS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
  yearly: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!,
}

export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    queries_per_month: 3,
    features: [
      '3 AI pet health queries (lifetime)',
      'Basic urgency assessment',
      'Photo history',
    ],
  },
  monthly: {
    name: 'PawCheck Premium',
    price: 14.99,
    interval: 'month',
    queries_per_month: 'unlimited',
    features: [
      'Unlimited AI health queries',
      'Detailed urgency assessments',
      'Full symptom history & tracking',
      'Vet finder when needed',
      'Multi-pet support',
      'Priority support',
    ],
  },
  yearly: {
    name: 'PawCheck Premium',
    price: 79,
    interval: 'year',
    queries_per_month: 'unlimited',
    discount_text: '56% off vs monthly',
    features: [
      'Everything in monthly',
      'Save $100/year vs monthly',
      'Priority support',
    ],
  },
}

export async function createCheckoutSession(params: {
  userId: string
  email: string
  priceId: string
  successUrl: string
  cancelUrl: string
  stripeCustomerId?: string | null
}) {
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.userId,
    metadata: {
      user_id: params.userId,
    },
    subscription_data: {
      metadata: {
        user_id: params.userId,
      },
    },
    allow_promotion_codes: true,
  }

  if (params.stripeCustomerId) {
    sessionConfig.customer = params.stripeCustomerId
  } else {
    sessionConfig.customer_email = params.email
  }

  return getStripe().checkout.sessions.create(sessionConfig)
}

export async function createBillingPortalSession(params: {
  customerId: string
  returnUrl: string
}) {
  return getStripe().billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  })
}
