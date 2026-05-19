import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle2, CreditCard, Sparkles } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import BillingPortalButton from '@/components/BillingPortalButton'

export default async function BillingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, stripe_customer_id, subscription_status, subscription_tier, subscription_period_end, free_queries_used, total_queries_count')
    .eq('id', user.id)
    .single()

  const isSubscribed = profile?.subscription_status === 'active'

  return (
    <div className="container max-w-3xl py-8 lg:py-12">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold text-ink leading-tight">
          Settings
        </h1>
        <p className="mt-2 text-ink-mute">
          Manage your subscription and account.
        </p>
      </div>

      {/* Subscription card */}
      <div className="bg-card rounded-2xl border border-cream-300/60 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-ink">
            Subscription
          </h2>
          {isSubscribed ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-forest-50 text-forest-700 text-xs font-medium border border-forest-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cream-200 text-ink-mute text-xs font-medium">
              Free plan
            </span>
          )}
        </div>

        {isSubscribed ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-ink-mute">Plan</p>
              <p className="font-medium text-ink capitalize">
                PawCheck Premium ({profile?.subscription_tier})
              </p>
            </div>
            {profile?.subscription_period_end && (
              <div>
                <p className="text-sm text-ink-mute">Renews on</p>
                <p className="font-medium text-ink">
                  {formatDate(profile.subscription_period_end)}
                </p>
              </div>
            )}
            {profile?.stripe_customer_id && (
              <BillingPortalButton />
            )}
          </div>
        ) : (
          <div>
            <p className="text-ink-soft mb-3">
              You're on the free plan with{' '}
              <strong className="text-ink tabular-nums">
                {Math.max(0, 3 - (profile?.free_queries_used ?? 0))}
              </strong>{' '}
              assessments remaining.
            </p>
            <Button asChild variant="accent">
              <Link href="/upgrade">
                <Sparkles className="w-4 h-4" />
                Upgrade to Premium
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Account info */}
      <div className="bg-card rounded-2xl border border-cream-300/60 p-6 mb-6">
        <h2 className="font-display text-xl font-semibold text-ink mb-4">
          Account
        </h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-ink-mute">Name</p>
            <p className="font-medium text-ink">{profile?.full_name}</p>
          </div>
          <div>
            <p className="text-sm text-ink-mute">Email</p>
            <p className="font-medium text-ink">{profile?.email}</p>
          </div>
          <div>
            <p className="text-sm text-ink-mute">Total assessments</p>
            <p className="font-medium text-ink tabular-nums">
              {profile?.total_queries_count ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Legal links */}
      <div className="bg-card rounded-2xl border border-cream-300/60 p-6">
        <h2 className="font-display text-xl font-semibold text-ink mb-4">
          Legal
        </h2>
        <div className="space-y-2 text-sm">
          <Link href="/terms" className="block text-forest-600 hover:underline">
            Terms of Service
          </Link>
          <Link href="/privacy" className="block text-forest-600 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/disclaimer" className="block text-forest-600 hover:underline">
            Medical Disclaimer
          </Link>
        </div>
      </div>
    </div>
  )
}
