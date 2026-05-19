import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL || 'PawCheck <hello@pawcheck.app>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pawcheck.app'

export async function sendVaccineReminderEmail(params: {
  to: string
  petName: string
  vaccineName: string
  dueDate: string
  daysUntilDue: number
}) {
  const subject =
    params.daysUntilDue <= 0
      ? `${params.petName}'s ${params.vaccineName} is overdue`
      : `${params.petName}'s ${params.vaccineName} is due in ${params.daysUntilDue} days`

  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject,
    html: `
<div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #FAF7F2;">
  <div style="text-align: center; padding: 32px 24px; background: #FFFFFF; border-radius: 16px; border: 1px solid #E5D9C3;">
    <div style="font-family: Georgia, serif; font-size: 28px; color: #2D5A4E; font-weight: bold; margin-bottom: 8px;">
      PawCheck 🐾
    </div>
    <h1 style="font-family: Georgia, serif; color: #1A1614; margin: 24px 0 12px;">
      ${params.petName}'s vaccine reminder
    </h1>
    <p style="color: #4A423E; line-height: 1.6;">
      Just a reminder that <strong>${params.petName}'s ${params.vaccineName}</strong> is ${params.daysUntilDue <= 0 ? 'overdue' : `due in ${params.daysUntilDue} days`}.
    </p>
    <p style="color: #4A423E; line-height: 1.6;">
      Due date: <strong>${params.dueDate}</strong>
    </p>
    <a href="${APP_URL}/pets" style="display: inline-block; background: #2D5A4E; color: #FAF7F2; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
      Open PawCheck
    </a>
  </div>
  <p style="text-align: center; font-size: 12px; color: #7C736D; margin-top: 24px;">
    You're receiving this because you enabled vaccine reminders. 
    <a href="${APP_URL}/notifications" style="color: #2D5A4E;">Manage preferences</a>
  </p>
</div>
    `,
  })
}

export async function sendWelcomeEmail(params: { to: string; name: string }) {
  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: 'Welcome to PawCheck 🐾',
    html: `
<div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #FAF7F2;">
  <div style="padding: 32px 24px; background: #FFFFFF; border-radius: 16px; border: 1px solid #E5D9C3;">
    <h1 style="font-family: Georgia, serif; color: #1A1614;">
      Welcome, ${params.name}!
    </h1>
    <p style="color: #4A423E; line-height: 1.6;">
      Thanks for joining PawCheck. You've got 3 free AI assessments to try.
    </p>
    <p style="color: #4A423E; line-height: 1.6;">
      Add your pet's profile and snap a photo whenever something looks off — we'll help you decide if it's a "wait and see" or "call the vet now."
    </p>
    <a href="${APP_URL}/dashboard" style="display: inline-block; background: #E8A547; color: #1A1614; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
      Start your first assessment
    </a>
    <p style="color: #4A423E; line-height: 1.6; margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5D9C3; font-size: 14px;">
      <strong>Important:</strong> PawCheck provides informational guidance, not veterinary diagnosis. Always consult a licensed vet for medical advice.
    </p>
  </div>
</div>
    `,
  })
}

export async function sendCommunityCommentEmail(params: {
  to: string
  postTitle: string
  commenterName: string
  postId: string
}) {
  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `${params.commenterName} commented on your post`,
    html: `
<div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #FAF7F2;">
  <div style="padding: 32px 24px; background: #FFFFFF; border-radius: 16px; border: 1px solid #E5D9C3;">
    <h1 style="font-family: Georgia, serif; color: #1A1614; font-size: 22px;">
      New comment on your post
    </h1>
    <p style="color: #4A423E; line-height: 1.6;">
      <strong>${params.commenterName}</strong> commented on your post:
    </p>
    <div style="padding: 16px; background: #FAF7F2; border-radius: 8px; margin: 16px 0;">
      <em style="color: #1A1614;">"${params.postTitle}"</em>
    </div>
    <a href="${APP_URL}/community/post/${params.postId}" style="display: inline-block; background: #2D5A4E; color: #FAF7F2; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      View comment
    </a>
  </div>
</div>
    `,
  })
}
