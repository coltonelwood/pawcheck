/**
 * Expo Push helper
 *
 * Mobile clients register an ExponentPushToken[...] which we send to
 * https://exp.host/--/api/v2/push/send. Expo handles APNs (iOS) and FCM (Android)
 * routing so we don't need separate cert/key setups.
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { createServiceRoleClient } from './supabase/server'

interface ExpoPushPayload {
  title: string
  body: string
  data?: Record<string, any>
  sound?: 'default' | null
  badge?: number
  priority?: 'default' | 'normal' | 'high'
}

interface ExpoPushReceipt {
  status: 'ok' | 'error'
  message?: string
  details?: { error?: string }
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export async function sendExpoPushToUser(userId: string, payload: ExpoPushPayload) {
  const supabase = createServiceRoleClient()
  const { data: tokens } = await supabase
    .from('expo_push_tokens')
    .select('id, token')
    .eq('user_id', userId)

  if (!tokens || tokens.length === 0) return { sent: 0 }
  return sendExpoPushToTokens(
    tokens.map((t) => ({ id: t.id, token: t.token })),
    payload
  )
}

export async function sendExpoPushToTokens(
  tokenRecords: { id: string; token: string }[],
  payload: ExpoPushPayload
) {
  const messages = tokenRecords.map((rec) => ({
    to: rec.token,
    sound: payload.sound ?? 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    priority: payload.priority || 'high',
    ...(payload.badge !== undefined && { badge: payload.badge }),
  }))

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })

    const result = await res.json()
    const receipts: ExpoPushReceipt[] = result.data || []
    const sent = receipts.filter((r) => r.status === 'ok').length

    // Clean up expired/invalid tokens
    const supabase = createServiceRoleClient()
    const expiredIds: string[] = []
    receipts.forEach((r, i) => {
      if (
        r.status === 'error' &&
        (r.details?.error === 'DeviceNotRegistered' || r.details?.error === 'InvalidCredentials')
      ) {
        expiredIds.push(tokenRecords[i].id)
      }
    })
    if (expiredIds.length > 0) {
      await supabase.from('expo_push_tokens').delete().in('id', expiredIds)
    }

    return { sent, total: messages.length, expired: expiredIds.length }
  } catch (err: any) {
    console.error('Expo push failed:', err.message)
    return { sent: 0, error: err.message }
  }
}
