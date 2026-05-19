import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Heart,
  LayoutDashboard,
  History,
  Settings,
  Camera,
  PawPrint,
  GraduationCap,
  Apple,
  MapPin,
  Users,
  Bell,
} from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, subscription_status, subscription_tier, free_queries_used')
    .eq('id', user.id)
    .single()

  const isFreeTier = profile?.subscription_status !== 'active'
  const queriesRemaining = Math.max(0, 3 - (profile?.free_queries_used ?? 0))

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/query/new', label: 'New assessment', icon: Camera },
    { href: '/pets', label: 'My pets', icon: PawPrint },
    { href: '/training', label: 'Training', icon: GraduationCap, premium: true },
    { href: '/nutrition', label: 'Nutrition', icon: Apple, premium: true },
    { href: '/vets', label: 'Find a vet', icon: MapPin },
    { href: '/community', label: 'Community', icon: Users },
    { href: '/history', label: 'History', icon: History },
  ]

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-card border-r border-cream-300/60 sticky top-0 h-screen">
        <div className="p-6 border-b border-cream-300/60">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-forest-600 flex items-center justify-center">
              <Heart className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <span className="font-display text-xl font-bold text-ink">PawCheck</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-soft hover:bg-cream-200 hover:text-ink transition-colors group"
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1">{item.label}</span>
              {item.premium && isFreeTier && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                  PRO
                </span>
              )}
            </Link>
          ))}

          <div className="pt-3 mt-3 border-t border-cream-300/40 space-y-1">
            <Link
              href="/notifications"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-soft hover:bg-cream-200 hover:text-ink transition-colors"
            >
              <Bell className="w-4 h-4" />
              Notifications
            </Link>
            <Link
              href="/billing"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-soft hover:bg-cream-200 hover:text-ink transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>
        </nav>

        {/* Free tier badge */}
        {isFreeTier && (
          <div className="p-4">
            <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200/60">
              <div className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-1">
                Free plan
              </div>
              <div className="font-display text-2xl font-bold text-ink tabular-nums">
                {queriesRemaining}
                <span className="text-base font-medium text-ink-mute ml-1">
                  / 3 left
                </span>
              </div>
              <Link
                href="/upgrade"
                className="mt-3 block text-center bg-forest-600 text-cream-100 text-sm font-medium px-3 py-2 rounded-lg hover:bg-forest-700 transition-colors"
              >
                Upgrade
              </Link>
            </div>
          </div>
        )}

        {/* User info */}
        <div className="p-4 border-t border-cream-300/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-forest-100 flex items-center justify-center text-forest-700 font-semibold text-sm">
              {(profile?.full_name || profile?.email || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">
                {profile?.full_name || 'User'}
              </div>
              <div className="text-xs text-ink-mute truncate">{profile?.email}</div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-card border-b border-cream-300/60">
        <div className="flex items-center justify-between p-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-forest-600 flex items-center justify-center">
              <Heart className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <span className="font-display text-lg font-bold text-ink">PawCheck</span>
          </Link>
          {isFreeTier && (
            <Link
              href="/upgrade"
              className="text-xs font-medium bg-amber-400 text-ink px-3 py-1.5 rounded-full"
            >
              {queriesRemaining} free left
            </Link>
          )}
        </div>
      </div>

      {/* Mobile bottom nav - 5 most important */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-cream-300/60">
        <div className="grid grid-cols-5">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 py-3 text-[10px] text-ink-mute hover:text-ink transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            Home
          </Link>
          <Link href="/query/new" className="flex flex-col items-center gap-1 py-3 text-[10px] text-ink-mute hover:text-ink transition-colors">
            <Camera className="w-5 h-5" />
            Assess
          </Link>
          <Link href="/pets" className="flex flex-col items-center gap-1 py-3 text-[10px] text-ink-mute hover:text-ink transition-colors">
            <PawPrint className="w-5 h-5" />
            Pets
          </Link>
          <Link href="/community" className="flex flex-col items-center gap-1 py-3 text-[10px] text-ink-mute hover:text-ink transition-colors">
            <Users className="w-5 h-5" />
            Community
          </Link>
          <Link href="/billing" className="flex flex-col items-center gap-1 py-3 text-[10px] text-ink-mute hover:text-ink transition-colors">
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 pt-16 pb-20 lg:pt-0 lg:pb-0">
        {children}
      </main>
    </div>
  )
}
