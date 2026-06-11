'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Heart, ArrowLeft, Loader2 } from 'lucide-react'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const guard = await fetch('/api/auth/guard', { method: 'POST' })
    if (guard.status === 429) {
      setError('Too many attempts from your network. Please wait and try again.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    // Redirect to pet onboarding (or upgrade if plan was selected)
    if (plan) {
      router.push(`/upgrade?plan=${plan}`)
    } else {
      router.push('/pet/new')
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="container py-6">
        <Link href="/" className="inline-flex items-center gap-2 text-ink-mute hover:text-ink transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-forest-600 flex items-center justify-center">
                <Heart className="w-5 h-5 text-amber-400 fill-amber-400" />
              </div>
              <span className="font-display text-2xl font-bold text-ink">
                PawCheck
              </span>
            </Link>
          </div>

          <div className="bg-card rounded-2xl border border-cream-300/60 p-8 shadow-[0_8px_24px_-8px_rgba(45,90,78,0.1)]">
            <h1 className="font-display text-3xl font-bold text-ink leading-tight">
              Create your account
            </h1>
            <p className="mt-2 text-ink-mute">
              3 free assessments. No credit card.
            </p>

            <form onSubmit={handleSignup} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Your name</Label>
                <Input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="p-3 bg-urgency-red/10 border border-urgency-red/20 rounded-lg text-sm text-urgency-red">
                  {error}
                </div>
              )}

              <Button type="submit" variant="accent" size="lg" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-mute">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-forest-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-ink-mute leading-relaxed">
            By signing up, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-ink">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-ink">
              Privacy Policy
            </Link>
            . PawCheck provides informational guidance only, not veterinary
            medical advice.
          </p>
        </div>
      </main>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignupForm />
    </Suspense>
  )
}
