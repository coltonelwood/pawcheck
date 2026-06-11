#!/usr/bin/env node
/**
 * Seed an App Review demo account: a confirmed, PREMIUM user with sample pets
 * and assessments (incl. an emergency result), so reviewers can exercise the
 * full app immediately.
 *
 * Usage (from the pawcheck/ web repo so @supabase/supabase-js resolves):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   REVIEW_EMAIL=appreview@purelyticlabs.com REVIEW_PASSWORD='PawCheckReview!2026' \
 *   node scripts/seed-review-account.mjs
 *
 * Idempotent: deletes and recreates the demo user each run.
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY
const EMAIL = process.env.REVIEW_EMAIL || 'appreview@purelyticlabs.com'
const PASSWORD = process.env.REVIEW_PASSWORD || 'PawCheckReview!2026'
if (!URL || !SR) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const db = createClient(URL, SR, { auth: { persistSession: false } })

const nowISO = () => new Date().toISOString()

async function main() {
  // 1. Remove any existing demo user (cascades to all their data).
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = list.users.find((u) => u.email === EMAIL)
  if (existing) await db.auth.admin.deleteUser(existing.id)

  // 2. Create a confirmed user.
  const { data: created, error: cErr } = await db.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'App Review' },
  })
  if (cErr) throw cErr
  const uid = created.user.id

  // 3. Grant premium (service role bypasses the profiles column guard).
  await db
    .from('profiles')
    .update({ subscription_status: 'active', subscription_tier: 'yearly', full_name: 'App Review' })
    .eq('id', uid)

  // 4. Pets.
  const petsPayload = [
    { user_id: uid, name: 'Biscuit', species: 'dog', breed: 'Golden Retriever', date_of_birth: '2021-04-12', weight_lbs: 68 },
    { user_id: uid, name: 'Luna', species: 'cat', breed: 'Domestic Shorthair', date_of_birth: '2019-09-01', weight_lbs: 10 },
    { user_id: uid, name: 'Pepper', species: 'dog', breed: 'French Bulldog', date_of_birth: '2023-01-20', weight_lbs: 24 },
  ]
  const { data: pets, error: pErr } = await db.from('pets').insert(petsPayload).select('id, name')
  if (pErr) throw pErr
  const byName = Object.fromEntries(pets.map((p) => [p.name, p.id]))

  // 5. Sample completed assessments (green / yellow / red) so history + the
  //    emergency UI are populated. Photo-less (input_method 'describe') to avoid
  //    storage dependencies.
  const queries = [
    {
      user_id: uid, pet_id: byName.Biscuit, input_method: 'describe', photo_url: null,
      description: 'Mild redness between two toes on the front left paw, licking it occasionally.',
      status: 'complete', urgency: 'green', urgency_label: 'Monitor at home',
      description_summary: 'Mild localized paw irritation, likely from licking or a minor irritant.',
      likely_causes: [
        { name: 'Contact irritation', probability: 'high', explanation: 'Common from grass, salt, or allergens between the toes.' },
        { name: 'Early hot spot', probability: 'moderate', explanation: 'Repeated licking can start a localized skin reaction.' },
      ],
      recommended_action: 'Rinse and dry the paw, discourage licking, and monitor for 24–48 hours.',
      vet_visit: 'monitor', confidence_score: 72, red_flags: ['Spreading redness', 'Swelling or pus', 'Limping'],
      followup_questions: ['Any change in diet or new environments?', 'Is your dog licking other paws too?'],
      completed_at: nowISO(),
    },
    {
      user_id: uid, pet_id: byName.Luna, input_method: 'guided', photo_url: null,
      description: 'Vomited 3 times today, still drinking water, slightly less active than usual.',
      status: 'complete', urgency: 'yellow', urgency_label: 'See a vet soon',
      description_summary: 'Repeated vomiting in 24 hours with mild lethargy — warrants a vet visit if it continues.',
      likely_causes: [
        { name: 'Dietary upset / hairball', probability: 'high', explanation: 'Frequent benign cause in cats.' },
        { name: 'GI inflammation', probability: 'moderate', explanation: 'Persistent vomiting can indicate gastritis.' },
      ],
      recommended_action: 'Withhold food for a few hours, offer water, and call your vet if vomiting continues or she stops drinking.',
      vet_visit: 'within_24h', confidence_score: 68, red_flags: ['Not drinking', 'Blood in vomit', 'Repeated retching'],
      followup_questions: ['Any access to plants or string?', 'Is she still using the litter box normally?'],
      completed_at: nowISO(),
    },
    {
      user_id: uid, pet_id: byName.Pepper, input_method: 'guided', photo_url: null,
      description: 'Breathing fast and seems to be struggling, gums look pale.',
      status: 'complete', urgency: 'red', urgency_label: 'Seek care now',
      description_summary: 'Labored breathing with pale gums is a potential emergency, especially in a brachycephalic breed.',
      likely_causes: [
        { name: 'Respiratory distress', probability: 'high', explanation: 'Pale gums + fast breathing can signal low oxygenation.' },
        { name: 'Heat or airway obstruction', probability: 'moderate', explanation: 'French Bulldogs are prone to airway issues.' },
      ],
      recommended_action: 'Seek emergency veterinary care immediately. Keep your dog calm and cool on the way.',
      vet_visit: 'immediate', confidence_score: 80, red_flags: ['Pale or blue gums', 'Collapse', 'Open-mouth breathing'],
      followup_questions: ['Any recent heat exposure or exertion?', 'How long has the breathing been labored?'],
      completed_at: nowISO(),
    },
  ]
  const { error: qErr } = await db.from('queries').insert(queries)
  if (qErr) throw qErr

  console.log('✓ Seeded review account')
  console.log('  email   :', EMAIL)
  console.log('  password:', PASSWORD)
  console.log('  premium :', 'active (yearly)')
  console.log('  pets    :', pets.map((p) => p.name).join(', '))
  console.log('  assessments: 3 (green, yellow, red/emergency)')
}

main().catch((e) => {
  console.error('Seed failed:', e.message)
  process.exit(1)
})
