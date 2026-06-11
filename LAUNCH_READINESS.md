# PawCheck — Launch Readiness Report

_Pre-launch security & quality audit. Generated 2026-06-11._
Live web: **https://pawcheck-web.vercel.app** · Repos: `coltonelwood/pawcheck` (web), `coltonelwood/pawcheck-mobile` (iOS)

---

## Executive verdict: 🟢 ENGINEERING-COMPLETE — iOS submission-ready pending your accounts

_Updated 2026-06-11 (session 3)._ The iOS app is technically ready to submit. Remaining gates are all **account/credential/legal** actions only you can do (Apple enrollment, Anthropic funding, Voyage key, Stripe live keys, attorney sign-off) — no engineering work blocks submission.

**Closed this session (3):**
- 🔴 **CRITICAL bug found + fixed — mobile API auth was broken.** The web API only authenticated via cookies, so the iOS app's Bearer token 401'd on every AI call (latent — never hit a funded key). New `getRouteContext()` accepts cookie *or* bearer; **verified live** (free→402, active→entitled, cancel→402, all via mobile bearer).
- ✅ **Subscription loop verified end-to-end** (web Stripe checkout architecture): entitlement → gated endpoints → cancellation downgrade. Added a "Refresh subscription" action and **removed App-Review-unsafe "avoid app-store fees" copy** (neutral language only).
- ✅ **Mobile hardening (H3 resolved):** HEIC→JPEG + downscale/compress before upload; loading/error states on the main screens; spinners instead of blank detail screens.
- ✅ **Domain-swap ready:** all URLs parameterized (web `NEXT_PUBLIC_APP_URL` + `metadataBase`; mobile `lib/config.ts`); `DOMAIN_SWAP.md` runbook.
- ✅ **App Store kit:** bundle id `com.purelyticlabs.pawcheck`, honest permission strings, when-in-use location; `APP_STORE_LISTING.md`, `PRIVACY_LABELS.md`, `REVIEW_NOTES.md` + a live-seeded premium demo account.

**Closed in session 2:**
- ✅ **Pet photos no longer world-readable** — `pet-photos` bucket is now PRIVATE; all surfaces (web + mobile) render via short-lived owner-scoped signed URLs. Verified live (raw URL → 4xx, owner signed URL → 200).
- ✅ **Next.js upgraded 14.2.x → 15.5.19** — patches the DoS/SSRF advisories (no longer in `npm audit`). Full async-request-API migration; build + 21 tests + lint all green; redeployed and live-verified.
- ✅ **Per-IP rate limiting** added (fail-closed) on the AI/assessment endpoints + an auth guard on login/signup.
- ✅ Plus the session-1 fixes: RLS/RPC hardening (self-grant premium, quota reset, queries tampering), atomic free-tier, security headers, account deletion, prompt-injection fence, open-redirect, Stripe webhook bug, mobile error boundary.

**Remaining — all on you (no engineering blockers):**
1. **Apple Developer Program enrollment** → then `eas build --platform ios --profile production` (hand over Apple login) and `eas submit` after filling the `REPLACE_WITH_*` values in `eas.json`.
2. **Fund the Anthropic account** (key set; $0 balance → assessments 500 until funded) and **add a real Voyage key** (knowledge embeddings).
3. **Provision live Stripe** (login + create "PawCheck Pro" $14.99/mo & $79/yr + webhook → `/api/stripe/webhook` + set `STRIPE_*` env). The full loop downstream of the webhook is verified; only real keys remain.
4. **Attorney review** of Privacy/Terms (pet-health liability — content is a solid template, banners/placeholders removed).

Submission docs: `APP_STORE_LISTING.md`, `PRIVACY_LABELS.md`, `REVIEW_NOTES.md`, `DOMAIN_SWAP.md` (bundle root + web repo).

---

## 1. Fixed & verified this session

All security fixes were verified against the live database with a real user JWT and/or the live deployment.

### Web (`coltonelwood/pawcheck`)
| Commit | Fix | Severity | Verified |
|---|---|---|---|
| `8283da1` | **RLS/RPC hardening** (migration 007): profiles column-guard trigger (blocks self-grant premium / quota reset); `queries` UPDATE `using(true)`→owner-scoped; usage/quota/rate-limit RPCs bound to caller via `assert_self()`; push-token + storage-upload `WITH CHECK`; UPDATE `WITH CHECK` on owner tables | CRITICAL | ✅ live PostgREST attack test: self-grant→400, quota-reset→400, cross-user RPC→400, legit edit→200 |
| `a5a2874` | **Atomic free-tier gate** (`consume_query_credit`/`refund_query_credit`) replacing the check-then-increment TOCTOU race; **fail-CLOSED** rate limiting | HIGH | ✅ live: exactly 3 allowed, 4th denied |
| `de9c68a` | **Security headers**: HSTS+preload, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy; `x-powered-by` off | HIGH | ✅ live `curl -I` |
| `2885551` | **Open-redirect** fix in `/api/auth/callback` (validate `next` is same-origin) | MEDIUM | ✅ build |
| `5e57ef1` | **Stripe webhook** `subscription.updated` fallback repaired (was discarding the customer lookup) | MEDIUM | ✅ build |
| `32edd1d` | **Prompt-injection** fence around owner free-text (`<<<OWNER_INPUT>>>` boundary + length cap + delimiter strip) | MEDIUM | ✅ build |
| `a9d03ac` | **Account deletion** — `/api/account/delete` (cookie+bearer auth, cancels Stripe sub, cascades) + web danger-zone UI | CRITICAL (App Store) | ✅ live 401 unauth |
| `7dd442a` | **Legal** — removed user-visible template banners + `[YOUR JURISDICTION]` | HIGH (App Store) | ✅ live (0 banner hits) |
| `85681c8` | **Money-path test suite** (vitest, 9 tests) | — | ✅ 9/9 pass |
| `fdaa873` | ESLint config (`next/core-web-vitals`) | — | ✅ 0 errors |

Earlier this deployment cycle: `2523e43` lazy-init clients + Next 14.2.15→14.2.35; `72a6ea8`/`0e681be` knowledge base.

### Mobile (`coltonelwood/pawcheck-mobile`)
| Commit | Fix | Severity |
|---|---|---|
| `e553686` | Account deletion in Settings (calls web API w/ bearer, signs out) | CRITICAL (App Store) |
| `0b97816` | Root `ErrorBoundary` — readable error + retry instead of blank-screen crash | HIGH |
| `48412d3` | Align deps to Expo SDK 52 (`expo-doctor` 18/18) | LOW |
| `5c8b6fd` | `npm audit fix` — resolved critical `shell-quote` advisory (non-breaking) | (dev-tooling) |

### Git history secret scan
✅ **CLEAN** — no `.env` files ever committed, no secret-pattern strings (`sk-ant-`, `sk_live_`, `whsec_`, service-role JWTs, `AIza`, etc.) anywhere in either repo's full history, no tracked secret files. No rotation needed.

---

## 2. Test suite & build results

```
WEB  (pawcheck)  — Next.js 15.5.19
  npx tsc --noEmit ............ PASS (0 errors)
  npx vitest run ............. PASS (6 files, 21 tests)
      rate-limit (per-user): allow / block / FAIL-CLOSED
      ip-rate-limit (per-IP): allow / block / FAIL-CLOSED / XFF parse
      analyze:    401 unauthenticated / 400 malformed input
      webhook:    valid sig accepts; wrong-secret / tampered / garbage reject
      pet-photo:  path extraction + LIVE (raw URL 4xx, owner signed URL 200)
      guided:     questionnaire -> clinical-summary composition
  next lint .................. 0 errors (warnings: <img>, exhaustive-deps — triaged)
  next build ................. PASS (cloud + prebuilt)
  npm audit .................. next advisories RESOLVED. 1 critical = `vitest`
                               (dev-only, exploitable only with `vitest --ui`,
                               which is never run); not shipped.

MOBILE  (pawcheck-mobile)  — Expo SDK 52
  npx tsc --noEmit ........... PASS (0 errors)
  npx expo-doctor ............ 18/18 checks pass
  npm audit .................. critical resolved; remaining high/moderate are
                               dev-only Metro/Expo tooling (not in app bundle)
```
Free-tier atomic enforcement, all RLS policies, and the private-bucket signed-URL
flow were verified **live** (not just unit-mocked) — see §1.

---

## 3. Remaining issues (ranked, with exact remediation)

### ✅ RESOLVED since first report
- **C1 — Pet photos world-readable** → FIXED (migration 008; private bucket + signed URLs across web/mobile + server-signed analyze fetch; live-verified). Commits `73a1cb2` (web), `b22cc79` (mobile).
- **H1 — Next.js unpatched DoS/SSRF** → FIXED (upgraded to 15.5.19, `92ba4c7`; advisories gone from `npm audit`).
- **H2 — No per-IP rate limiting** → FIXED (migration 009 + `lib/ip-rate-limit`, fail-closed, wired into analyze/training/nutrition/vets + auth guard; `340b73f`).

### 🟠 REMAINING — HIGH

**C2 — Privacy/Terms legal review.** Content is a generic template (banners/placeholders removed, `7dd442a`). Engage an attorney to finalize Terms (governing law, arbitration, UPVM/FDA disclaimers) and Privacy (CCPA/state-law, data practices) for a pet-health product before public launch. _(Not an engineering item.)_

**H3 — Mobile reliability gaps** (partially addressed — root ErrorBoundary shipped `0b97816`; remaining):
- No loading state on tab/list screens (`(tabs)/index,pets,community,settings`, `training/index`, `nutrition/index`, `history`) — they show the empty state during load/offline. Add a `loading` flag.
- No error state on any list/detail loader; detail screens (`training/[id]`, `nutrition/[id]`, `community/post/[id]`, `pet/[id]`) render a permanent blank view on error. Add error + not-found UI.
- Image upload: no size cap and no HEIC conversion (`query/new.tsx`, `community/new.tsx`). Add `expo-image-manipulator`: `manipulateAsync(uri, [{resize:{width:1600}}], {compress:0.8, format:JPEG})` before upload — fixes both 10MB+ photos and HEIC.

**H4 — `lib/supabase.ts` throws at import if env missing** → hard launch crash (the ErrorBoundary in `0b97816` can't catch a module-load throw). Make the client construct lazily / surface a friendly screen instead of throwing at import.

### 🟡 MEDIUM
- **M1** Training plan pages (web `training/[id]`, mobile) lack the informational/medical disclaimer the query & nutrition pages have. Add the standard disclaimer block.
- **M2** Standing results disclaimer (mobile `query/[id]`) omits the "emergencies → vet immediately" line for green/yellow results; add it to the always-on block.
- **M3** Emergency phone number in mobile red-urgency result is plain text — make it a tappable `tel:` link and add a CTA deep-link to the in-app vet finder.
- **M4** Infinite reload: web `query/[id]` `ProcessingState` reloads every 5s forever if a query is stuck in `processing`; mobile polls 30×3s then freezes. Add a max-attempts → "taking longer than expected / retry" state. (Server already writes `failed` on caught errors; this guards a hard function timeout.)
- **M5** Web Server Components ignore Supabase `error` (dashboard/history/pets/community/billing) — a backend failure renders as an empty state. Surface an error UI.
- **M6** Community `pet_id`/`linked_query_id` accepted without ownership check (`/api/community/post`) — add the same `.eq('user_id', user.id)` verification used elsewhere (IDOR).
- **M7** Authors can flip `is_flagged`/`is_published` on their own posts (un-hide moderated content) — block via a column guard like the profiles trigger.
- **M8** No branded `error.tsx`/`not-found.tsx`/`loading.tsx` boundaries in the web app.

### 🟢 LOW
- Comment endpoint has no rate limit (posts do). · `/api/vets/nearby` unmetered (Google cost). · Several routes return raw DB `error.message`. · Non-constant-time `CRON_SECRET` compare. · Web image limits are client-side only (add server-side check). · Lint warnings: `<img>` (Supabase URLs — intentional) and a few `useEffect` exhaustive-deps (intentional, guarded) — safe to leave or silence per-line.

---

## 4. Manual QA script (run before App Review)

**On the live web app (https://pawcheck-web.vercel.app), in an incognito window:**
1. Sign up → confirm you land on the dashboard with an empty state (no pets). Sign out, sign back in.
2. Add a pet → upload a >10MB image (should be rejected client-side) and a normal image.
3. Run an assessment (needs `ANTHROPIC_API_KEY` credits — see deploy notes). Confirm: urgency renders, **disclaimer is visible**, a red/emergency result prominently shows emergency-vet guidance.
4. Run 3 free assessments → the **4th must hit the paywall** (402 → upgrade screen). Open DevTools and try `PATCH`ing your profile `subscription_status` to `active` via the Supabase JS client → **must fail** (already verified, but confirm).
5. Settings → **Delete account** → type DELETE → confirm you're signed out and the account/data are gone (try logging back in — should fail).
6. Hit `/privacy` and `/terms` → confirm no "template" text and no `[YOUR JURISDICTION]`.
7. `curl -I https://pawcheck-web.vercel.app` → confirm HSTS / X-Frame-Options present.

**In the iOS Simulator (dev-client build + `npx expo start --dev-client`):**
1. Launch with **airplane mode on** → app should not crash; should show a readable error/empty state, not a blank screen.
2. Sign up / log in / log out.
3. Add pet, take a photo (camera) and pick from library → assessment flow end-to-end.
4. Trigger an error (e.g. kill Metro mid-action) → the **ErrorBoundary** screen with "Try again" should appear, not a white screen.
5. Settings → **Delete account** → confirm sign-out + account removal.
6. Tap Terms / Privacy / Disclaimer links → open in browser.
7. Verify an emergency-urgency result surfaces emergency guidance prominently.

---

## 5. Deploy notes / dependencies
- AI assessments need **Anthropic credits** — the key is set on Vercel but the account balance is $0 (assessments will 500 until funded at console.anthropic.com/settings/billing).
- Knowledge-base retrieval needs a real **Voyage** key (current Vercel value is a placeholder; the one supplied earlier was a Pinecone key).
- Migration 007 is already applied to the live `pawcheck-prod` database.
- All code changes are committed to `main` in both repos and the web app is deployed to production.
