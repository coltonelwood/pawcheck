/**
 * Web push notification helpers.
 * Uses VAPID for server-side push.
 * 
 * Generate VAPID keys once:
 *   npx web-push generate-vapid-keys
 * 
 * Store as VAPID_PUBLIC_KEY (also exposed as NEXT_PUBLIC) and VAPID_PRIVATE_KEY.
 */

import webpush from 'web-push'

// Lazy init - only when actually sending
let initialized = false
function initWebPush() {
  if (initialized) return
  
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const contact = process.env.VAPID_CONTACT_EMAIL || 'mailto:hello@pawcheck.app'
  
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys not configured')
  }
  
  webpush.setVapidDetails(contact, publicKey, privateKey)
  initialized = true
}

export interface PushSubscriptionRecord {
  endpoint: string
  p256dh: string
  auth_secret: string
}

export async function sendPushNotification(params: {
  subscription: PushSubscriptionRecord
  title: string
  body: string
  url?: string
  icon?: string
}) {
  initWebPush()
  
  const payload = JSON.stringify({
    title: params.title,
    body: params.body,
    url: params.url || '/',
    icon: params.icon || '/icons/icon-192.png',
  })

  try {
    await webpush.sendNotification(
      {
        endpoint: params.subscription.endpoint,
        keys: {
          p256dh: params.subscription.p256dh,
          auth: params.subscription.auth_secret,
        },
      },
      payload
    )
    return { success: true }
  } catch (error: any) {
    // Subscription expired (410) or invalid (404) - caller should delete it
    return {
      success: false,
      shouldDelete: error.statusCode === 410 || error.statusCode === 404,
      error: error.message,
    }
  }
}
