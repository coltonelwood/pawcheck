#!/usr/bin/env node
/**
 * Accuracy evaluation harness (Part C).
 *
 * Runs eval/golden-set.json against the LIVE assessment pipeline and reports:
 *   - urgency calibration (HARD FAIL: any emergency/toxin case scoring below red)
 *   - clarification trigger accuracy (ambiguous -> clarify, emergency -> final)
 *   - grounding rate (final answers citing >=1 retrieved source)
 *
 * Requires a funded Anthropic account. Usage (from the pawcheck/ web repo):
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... \
 *   EVAL_EMAIL=appreview@purelyticlabs.com EVAL_PASSWORD='PawCheckReview!2026' \
 *   BASE_URL=https://pawcheck-web.vercel.app \
 *   node scripts/eval-assessment.mjs [--limit N] [--concurrency 4]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const URL = process.env.SUPABASE_URL
const ANON = process.env.SUPABASE_ANON_KEY
const BASE = process.env.BASE_URL || 'https://pawcheck-web.vercel.app'
const EMAIL = process.env.EVAL_EMAIL || 'appreview@purelyticlabs.com'
const PASSWORD = process.env.EVAL_PASSWORD || 'PawCheckReview!2026'
const argLimit = Number((process.argv.find((a) => a.startsWith('--limit=')) || '').split('=')[1]) || Infinity
const concurrency = Number((process.argv.find((a) => a.startsWith('--concurrency=')) || '').split('=')[1]) || 4
if (!URL || !ANON) { console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY'); process.exit(1) }

const catFilter = (process.argv.find((a) => a.startsWith('--category=')) || '').split('=')[1]
const __dir = path.dirname(fileURLToPath(import.meta.url))
let cases = JSON.parse(fs.readFileSync(path.join(__dir, '..', 'eval', 'golden-set.json'), 'utf8'))
if (catFilter) {
  const want = catFilter.split(',')
  cases = cases.filter((c) => want.includes(c.category))
}
cases = cases.slice(0, argLimit)

const BAND = { green: 0, yellow: 1, red: 2 }

async function jpost(url, headers, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
  const text = await r.text()
  let json; try { json = JSON.parse(text) } catch { json = { _raw: text } }
  return { status: r.status, json }
}
async function jget(url, headers) {
  const r = await fetch(url, { headers })
  return r.json()
}

async function main() {
  // sign in
  const auth = await jpost(`${URL}/auth/v1/token?grant_type=password`, { apikey: ANON }, { email: EMAIL, password: PASSWORD })
  const token = auth.json.access_token
  if (!token) { console.error('Auth failed:', auth.json); process.exit(1) }
  const H = { apikey: ANON, Authorization: `Bearer ${token}` }

  // ensure a dog + cat eval pet
  const pets = await jget(`${URL}/rest/v1/pets?select=id,name,species`, H)
  async function ensurePet(species, name) {
    const found = pets.find((p) => p.species === species)
    if (found) return found.id
    const r = await fetch(`${URL}/rest/v1/pets`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ name, species, breed: 'Mixed' }) })
    const created = await r.json()
    return created[0].id
  }
  const petId = { dog: await ensurePet('dog', 'EvalDog'), cat: await ensurePet('cat', 'EvalCat') }

  const results = []
  let idx = 0
  async function worker() {
    while (idx < cases.length) {
      const c = cases[idx++]
      let attempt = 0, res
      while (attempt++ < 3) {
        res = await jpost(`${BASE}/api/analyze`, H, { pet_id: petId[c.pet.species] || petId.dog, input_method: 'describe', description: c.description })
        if (res.status !== 429) break
        await new Promise((r) => setTimeout(r, 4000 * attempt))
      }
      const mode = res.json.mode || (res.json.result ? 'final' : null)
      const urgency = res.json.result?.urgency || null
      const sources = res.json.result?.sources || []
      const grounding = res.json.result?.grounding_confidence || null
      results.push({ ...c, status: res.status, gotMode: mode, gotUrgency: urgency, nSources: sources.length, grounding, err: res.status >= 400 ? (res.json.error || res.json._raw) : null })
      process.stdout.write('.')
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  process.stdout.write('\n\n')

  // ---- metrics ----
  const ok = results.filter((r) => r.status === 200)
  const errs = results.filter((r) => r.status !== 200)
  const finals = ok.filter((r) => r.gotMode === 'final')

  // HARD: emergencies/toxins must never score below red
  const mustBeRed = ok.filter((r) => ['emergency', 'toxin'].includes(r.category) || (r.category === 'adversarial' && r.expected_urgency_band === 'red'))
  const underTriaged = mustBeRed.filter((r) => r.gotMode === 'final' && r.gotUrgency !== 'red')
  const clarifiedEmergency = mustBeRed.filter((r) => r.gotMode === 'clarify')

  // urgency calibration (final cases): exact band match + within-1-band
  const calCases = finals.filter((r) => r.expected_mode === 'final')
  const exact = calCases.filter((r) => r.gotUrgency === r.expected_urgency_band)
  const within1 = calCases.filter((r) => Math.abs((BAND[r.gotUrgency] ?? 9) - BAND[r.expected_urgency_band]) <= 1)

  // clarification trigger accuracy
  const clarifyExpected = ok.filter((r) => r.expected_mode === 'clarify')
  const clarifyHit = clarifyExpected.filter((r) => r.gotMode === 'clarify')
  const finalExpected = ok.filter((r) => r.expected_mode === 'final')
  const finalHit = finalExpected.filter((r) => r.gotMode === 'final')

  // grounding rate
  const grounded = finals.filter((r) => r.nSources > 0)

  const pct = (a, b) => (b ? ((100 * a) / b).toFixed(0) + '%' : 'n/a')
  console.log('===== PawCheck assessment eval =====')
  console.log(`cases run: ${results.length}  (ok ${ok.length}, errors ${errs.length})`)
  console.log('')
  console.log(`HARD SAFETY — emergencies/toxins under-triaged below red: ${underTriaged.length}  ${underTriaged.length === 0 ? 'PASS ✅' : 'FAIL ❌'}`)
  if (underTriaged.length) underTriaged.forEach((r) => console.log(`   ❌ ${r.id}: got ${r.gotUrgency}`))
  console.log(`HARD SAFETY — emergencies asked to clarify (should not): ${clarifiedEmergency.length}  ${clarifiedEmergency.length === 0 ? 'PASS ✅' : 'WARN ⚠️'}`)
  if (clarifiedEmergency.length) clarifiedEmergency.forEach((r) => console.log(`   ⚠️ ${r.id}`))
  console.log('')
  console.log(`Urgency calibration (final cases): exact ${pct(exact.length, calCases.length)} (${exact.length}/${calCases.length}), within-1-band ${pct(within1.length, calCases.length)}`)
  console.log(`Clarification trigger: ambiguous→clarify ${pct(clarifyHit.length, clarifyExpected.length)} (${clarifyHit.length}/${clarifyExpected.length}); final-expected→final ${pct(finalHit.length, finalExpected.length)}`)
  console.log(`Grounding rate (final answers citing ≥1 source): ${pct(grounded.length, finals.length)} (${grounded.length}/${finals.length})`)
  if (errs.length) { console.log('\nerrors:'); errs.forEach((r) => console.log(`   ${r.id}: HTTP ${r.status} ${r.err}`)) }

  // per-case mismatches
  const miss = ok.filter((r) => (r.expected_mode === 'final' && r.gotUrgency !== r.expected_urgency_band) || (r.gotMode !== r.expected_mode))
  if (miss.length) {
    console.log('\nmismatches (review):')
    miss.forEach((r) => console.log(`   ${r.category}/${r.id}: expected ${r.expected_mode}/${r.expected_urgency_band}, got ${r.gotMode}/${r.gotUrgency || '-'}`))
  }
  fs.writeFileSync(path.join(__dir, '..', 'eval', 'last-run.json'), JSON.stringify(results, null, 2))
  console.log('\nfull results -> eval/last-run.json')
  if (underTriaged.length) process.exit(2)
}
main().catch((e) => { console.error(e); process.exit(1) })
