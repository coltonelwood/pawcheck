'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Heart, ArrowLeft, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Per-IP throttle (credential-stuffing defense-in-depth).
    const guard = await fetch('/api/auth/guard', { method: 'POST' })
    if (guard.status === 429) {
      setError('Too many attempts from your network. Please wait and try again.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
              Welcome back
            </h1>
            <p className="mt-2 text-ink-mute">Sign in to check on your pet</p>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="p-3 bg-urgency-red/10 border border-urgency-red/20 rounded-lg text-sm text-urgency-red">
                  {error}
                </div>
              )}

              <Button type="submit" variant="default" size="lg" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-mute">
              Don't have an account?{' '}
              <Link href="/signup" className="font-medium text-forest-600 hover:underline">
                Sign up free
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
