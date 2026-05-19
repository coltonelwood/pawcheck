import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendVaccineReminderEmail } from '@/lib/email'
import { sendPushNotification } from '@/lib/web-push'
import { sendExpoPushToTokens } from '@/lib/expo-push'

export const maxDuration = 60

// Triggered by Vercel Cron daily. Protected by CRON_SECRET header.
export async function GET(request: NextRequest) {
  // Auth: Vercel Cron sends Authorization: Bearer ${CRON_SECRET}
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const now = new Date()
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Find vaccines due within 7 days that haven't had reminders sent
  const { data: vaccines, error } = await supabase
    .from('vaccines')
    .select(
      `
      id, name, due_date, pet_id,
      pet:pets(name, user_id),
      user:profiles!user_id(email, full_name, notify_email_vaccine, notify_push_enabled)
    `
    )
    .lte('due_date', sevenDaysOut.toISOString().split('T')[0])
    .eq('reminder_sent', false)
    .not('due_date', 'is', null)

  if (error) {
    console.error('Vaccine fetch error:', error)
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
  }

  let emailsSent = 0
  let pushSent = 0
  let errors = 0

  for (const vaccine of vaccines || []) {
    try {
      const pet = vaccine.pet as any
      const user = vaccine.user as any
      if (!pet || !user) continue

      const dueDate = new Date(vaccine.due_date)
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Email notification
      if (user.notify_email_vaccine !== false) {
        await sendVaccineReminderEmail({
          to: user.email,
          petName: pet.name,
          vaccineName: vaccine.name,
          dueDate: dueDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          daysUntilDue,
        })
        emailsSent++
      }

      // Push notifications
      if (user.notify_push_enabled) {
        // Web push (VAPID) subscriptions
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('id, endpoint, p256dh, auth_secret')
          .eq('user_id', pet.user_id)

        for (const sub of subs || []) {
          const result = await sendPushNotification({
            subscription: {
              endpoint: sub.endpoint,
              p256dh: sub.p256dh,
              auth_secret: sub.auth_secret,
            },
            title: `${pet.name}'s ${vaccine.name} reminder`,
            body:
              daysUntilDue <= 0
                ? `Overdue by ${Math.abs(daysUntilDue)} days`
                : `Due in ${daysUntilDue} days`,
            url: `/pets`,
          })
          if (result.success) pushSent++
          if (result.shouldDelete) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id)
          }
        }

        // Expo push (mobile app)
        const { data: expoTokens } = await supabase
          .from('expo_push_tokens')
          .select('id, token')
          .eq('user_id', pet.user_id)
        if (expoTokens && expoTokens.length > 0) {
          const expoResult = await sendExpoPushToTokens(expoTokens, {
            title: `${pet.name}'s ${vaccine.name} reminder`,
            body:
              daysUntilDue <= 0
                ? `Overdue by ${Math.abs(daysUntilDue)} days`
                : `Due in ${daysUntilDue} days`,
            data: { url: `pawcheck://pets`, vaccineId: vaccine.id },
          })
          pushSent += expoResult.sent
        }
      }

      // Mark as sent
      await supabase
        .from('vaccines')
        .update({ reminder_sent: true })
        .eq('id', vaccine.id)
    } catch (err) {
      console.error('Reminder error for vaccine', vaccine.id, err)
      errors++
    }
  }

  return NextResponse.json({
    processed: vaccines?.length ?? 0,
    emailsSent,
    pushSent,
    errors,
  })
}
