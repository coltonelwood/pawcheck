'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, BellOff, Loader2 } from 'lucide-react'

export default function PushNotificationToggle({
  initialEnabled,
}: {
  initialEnabled: boolean
}) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false)
    }
  }, [])

  async function enablePush() {
    setLoading(true)
    setError(null)
    try {
      // Request permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError('Permission denied. Enable notifications in browser settings.')
        return
      }

      // Register service worker if not already
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Subscribe to push
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) throw new Error('Push not configured')

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      })

      // Send to server
      const subJson: any = subscription.toJSON()
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          user_agent: navigator.userAgent,
        }),
      })
      if (!res.ok) throw new Error('Failed to register subscription')

      setEnabled(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function disablePush() {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      const subscription = await registration?.pushManager.getSubscription()
      
      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe()
        await fetch(`/api/notifications/subscribe?endpoint=${encodeURIComponent(endpoint)}`, {
          method: 'DELETE',
        })
      } else {
        await fetch('/api/notifications/subscribe', { method: 'DELETE' })
      }
      setEnabled(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!supported) {
    return (
      <p className="text-sm text-ink-mute">
        Push notifications aren't supported on this browser. Try Chrome, Firefox, or Edge.
      </p>
    )
  }

  return (
    <div>
      {enabled ? (
        <Button variant="outline" onClick={disablePush} disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <BellOff className="w-4 h-4" />
          )}
          Disable push notifications
        </Button>
      ) : (
        <Button variant="accent" onClick={enablePush} disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          Enable push notifications
        </Button>
      )}
      {error && (
        <p className="mt-2 text-sm text-urgency-red">{error}</p>
      )}
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
