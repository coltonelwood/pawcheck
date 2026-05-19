'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, Bell, BellOff, Mail, Check } from 'lucide-react'
import PushNotificationToggle from '@/components/PushNotificationToggle'

interface Prefs {
  notify_email_vaccine: boolean
  notify_email_followup: boolean
  notify_email_community: boolean
  notify_push_enabled: boolean
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<Prefs>({
    notify_email_vaccine: true,
    notify_email_followup: true,
    notify_email_community: false,
    notify_push_enabled: false,
  })
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select(
          'notify_email_vaccine, notify_email_followup, notify_email_community, notify_push_enabled'
        )
        .single()
      if (data) setPrefs(data)
      setLoading(false)
    }
    load()
  }, [])

  async function updatePref(key: keyof Prefs, value: boolean) {
    setPrefs((p) => ({ ...p, [key]: value }))
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({ [key]: value })
      .eq('id', user.id)

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="container py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-forest-600" />
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-8 lg:py-12">
      <Link
        href="/billing"
        className="inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold text-ink leading-tight">
          Notifications
        </h1>
        <p className="mt-2 text-ink-mute">
          Choose how PawCheck reaches you.
        </p>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-forest-50 border border-forest-200 rounded-lg text-sm text-forest-700 flex items-center gap-2">
          <Check className="w-4 h-4" />
          Saved
        </div>
      )}

      {/* Push notifications */}
      <div className="bg-card rounded-2xl border border-cream-300/60 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">
              Push notifications
            </h2>
            <p className="text-sm text-ink-mute">Get alerts on this device</p>
          </div>
        </div>
        <PushNotificationToggle initialEnabled={prefs.notify_push_enabled} />
      </div>

      {/* Email preferences */}
      <div className="bg-card rounded-2xl border border-cream-300/60 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center">
            <Mail className="w-5 h-5 text-forest-700" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">
              Email notifications
            </h2>
            <p className="text-sm text-ink-mute">Choose what we email you</p>
          </div>
        </div>

        <div className="space-y-4">
          <PrefToggle
            label="Vaccine reminders"
            description="Get notified 7 days before vaccines are due"
            checked={prefs.notify_email_vaccine}
            onChange={(v) => updatePref('notify_email_vaccine', v)}
          />
          <PrefToggle
            label="Assessment follow-ups"
            description="Reminders to check in on your pet after high-urgency assessments"
            checked={prefs.notify_email_followup}
            onChange={(v) => updatePref('notify_email_followup', v)}
          />
          <PrefToggle
            label="Community activity"
            description="Comments on your posts and replies to your comments"
            checked={prefs.notify_email_community}
            onChange={(v) => updatePref('notify_email_community', v)}
          />
        </div>
      </div>
    </div>
  )
}

function PrefToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div className="flex-1">
        <div className="font-medium text-ink">{label}</div>
        <div className="text-sm text-ink-mute">{description}</div>
      </div>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-cream-300 peer-checked:bg-forest-600 rounded-full transition-colors" />
        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-cream-50 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm" />
      </div>
    </label>
  )
}
