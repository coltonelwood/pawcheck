'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Sparkles, ArrowLeft, Loader2 } from 'lucide-react'

export default function UpgradePage() {
  const searchParams = useSearchParams()
  const presetPlan = searchParams.get('plan')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout(plan: 'monthly' | 'yearly') {
    setLoading(plan)
    setError(null)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Checkout failed')

      window.location.href = data.url
    } catch (err: any) {
      setError(err.message)
      setLoading(null)
    }
  }

  return (
    <div className="container max-w-4xl py-8 lg:py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-200/60 text-xs font-medium text-amber-800 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Unlimited peace of mind</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-ink leading-tight">
          Upgrade to PawCheck
          <br />
          <em className="italic text-forest-600">Premium</em>
        </h1>
        <p className="mt-4 text-lg text-ink-soft">
          One avoided unnecessary ER trip pays for years of PawCheck.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Monthly */}
        <div className="p-8 rounded-2xl bg-card border border-cream-300/60">
          <h3 className="font-display text-2xl font-semibold text-ink">
            Monthly
          </h3>
          <div className="mt-4 mb-6">
            <span className="font-display text-5xl font-bold text-ink tabular-nums">
              $14.99
            </span>
            <span className="text-ink-mute ml-2">/month</span>
          </div>
          <Button
            variant="outline"
            className="w-full mb-6"
            onClick={() => handleCheckout('monthly')}
            disabled={loading !== null}
          >
            {loading === 'monthly' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Subscribe monthly'
            )}
          </Button>
          <ul className="space-y-3 text-sm">
            {[
              'Unlimited AI assessments',
              'Photo history & tracking',
              'Multi-pet support',
              'Cancel anytime',
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-forest-500 flex-shrink-0 mt-0.5" />
                <span className="text-ink-soft">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Yearly - featured */}
        <div className="relative p-8 rounded-2xl bg-forest-600 text-cream-100 border-2 border-amber-400 shadow-[0_24px_48px_-12px_rgba(45,90,78,0.25)]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-ink text-xs font-bold px-3 py-1 rounded-full">
            SAVE 56%
          </div>
          <h3 className="font-display text-2xl font-semibold">Yearly</h3>
          <div className="mt-4 mb-1">
            <span className="font-display text-5xl font-bold tabular-nums">
              $79
            </span>
            <span className="text-cream-100/70 ml-2">/year</span>
          </div>
          <p className="text-sm text-amber-300 mb-6 tabular-nums">
            That's $6.58/month
          </p>
          <Button
            variant="accent"
            className="w-full mb-6"
            onClick={() => handleCheckout('yearly')}
            disabled={loading !== null}
          >
            {loading === 'yearly' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Get best value'
            )}
          </Button>
          <ul className="space-y-3 text-sm">
            {[
              'Everything in monthly',
              'Save $100 vs monthly',
              'Priority AI processing',
              'Lock in this price forever',
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="text-cream-100/90">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error && (
        <div className="mt-6 max-w-md mx-auto p-4 bg-urgency-red/10 border border-urgency-red/20 rounded-lg text-sm text-urgency-red text-center">
          {error}
        </div>
      )}

      <p className="text-center mt-8 text-sm text-ink-mute">
        Secure payment via Stripe. Cancel anytime from your settings.
      </p>
    </div>
  )
}
