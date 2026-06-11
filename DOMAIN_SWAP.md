# PawCheck — Custom Domain Swap Runbook

Everything is parameterized so moving from `pawcheck-web.vercel.app` to a custom
domain (e.g. `pawcheck.app`) is **one env change per app** plus DNS + a couple of
external dashboards. Follow in order.

Throughout, replace `NEWDOMAIN` with your purchased domain (e.g. `pawcheck.app`)
and `https://NEWDOMAIN` with its `https://` URL.

---

## 0. Prereq
- Domain purchased at any registrar.
- Vercel project: `pawcheck-web` (team `colton1`, id `prj_PDtxKqRBGp1fBnL1GSgLV7iwjmyX`).

## 1. Add the domain to Vercel + DNS
```bash
cd ~/Desktop/pawcheck-bundle/pawcheck
vercel domains add NEWDOMAIN --scope team_S37TOKqA4uWWcTQueNm0pHkO
# also add the www variant if you want it:
vercel domains add www.NEWDOMAIN --scope team_S37TOKqA4uWWcTQueNm0pHkO
```
Then create the DNS records Vercel prints (at your registrar):
- **Apex (`NEWDOMAIN`)**: `A` record → `76.76.21.21` (Vercel's anycast IP), **or** an `ALIAS`/`ANAME` → `cname.vercel-dns.com` if your registrar supports it.
- **`www`**: `CNAME` → `cname.vercel-dns.com`.
- Vercel auto-provisions the TLS cert once DNS resolves (a few minutes to ~an hour).

Verify: `vercel domains inspect NEWDOMAIN --scope team_S37TOKqA4uWWcTQueNm0pHkO`

## 2. Point the web app at the new domain (single env change)
Every web URL reads from `NEXT_PUBLIC_APP_URL` (OG metadata via `metadataBase`,
email links, checkout success/cancel URLs, etc.).
```bash
cd ~/Desktop/pawcheck-bundle/pawcheck
vercel env rm  NEXT_PUBLIC_APP_URL production --yes --scope team_S37TOKqA4uWWcTQueNm0pHkO
printf 'https://NEWDOMAIN' | vercel env add NEXT_PUBLIC_APP_URL production --scope team_S37TOKqA4uWWcTQueNm0pHkO
vercel --prod --scope team_S37TOKqA4uWWcTQueNm0pHkO     # redeploy so the new value is inlined
```

## 3. Supabase Auth URLs
Dashboard → Authentication → URL Configuration:
- **Site URL** → `https://NEWDOMAIN`
- **Redirect URLs** allow-list → add `https://NEWDOMAIN/**` (keep the vercel.app
  entry until the redirect in step 7 is live). The email-confirmation callback
  (`/api/auth/callback`) derives its origin from the request, so it adapts
  automatically once Site URL is set.

## 4. Stripe webhook endpoint (when Stripe is live)
Stripe Dashboard → Developers → Webhooks (or `stripe` CLI):
- Update (or add) the endpoint to `https://NEWDOMAIN/api/stripe/webhook` for
  events `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`.
- Copy the new signing secret → set `STRIPE_WEBHOOK_SECRET` on Vercel → redeploy.
- The checkout success/cancel URLs already use `NEXT_PUBLIC_APP_URL`, so they
  follow automatically after step 2.

## 5. GitHub Actions (knowledge-base cron)
The 24/7 ingest workflow calls the app by URL via a repo secret.
```bash
printf 'https://NEWDOMAIN' | gh secret set PAWCHECK_APP_URL --repo coltonelwood/pawcheck
```

## 6. Mobile app (requires a REBUILD — the URL is baked into the binary)
The mobile app reads one constant (`lib/config.ts` → `API_URL` / `UPGRADE_URL`)
sourced from `EXPO_PUBLIC_API_URL`. Update it in **both** places:
```bash
cd ~/Desktop/pawcheck-bundle/pawcheck-mobile
# local dev (.env.local):
#   EXPO_PUBLIC_API_URL=https://NEWDOMAIN
#   EXPO_PUBLIC_UPGRADE_URL=https://NEWDOMAIN/upgrade   (informational; UPGRADE_URL is derived)
# EAS build env (used by cloud builds):
eas env:create --name EXPO_PUBLIC_API_URL --value https://NEWDOMAIN \
  --visibility plaintext --scope project --environment production --environment development \
  --type string --non-interactive --force
eas env:create --name EXPO_PUBLIC_UPGRADE_URL --value https://NEWDOMAIN/upgrade \
  --visibility plaintext --scope project --environment production --environment development \
  --type string --non-interactive --force
```
Then **rebuild and resubmit** (a JS-only change can't update a constant read from
`expoConfig.extra` at build time):
```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```
> Existing installs keep pointing at the old URL until users update, which is why
> step 7 (redirect) matters.

## 7. Redirect the old vercel.app URL → new domain
So old links / older app installs keep working:
- Easiest: in Vercel, set `NEWDOMAIN` as the **primary** domain; `*.vercel.app`
  deployment URLs continue to serve, but you can add a redirect. Add to
  `vercel.json`:
  ```json
  { "redirects": [{ "source": "/:path*", "has": [{ "type": "host", "value": "pawcheck-web.vercel.app" }], "destination": "https://NEWDOMAIN/:path*", "permanent": true }] }
  ```
  Commit + redeploy. (Keep the Supabase redirect allow-list entry for the
  vercel.app host until you're confident no old mobile builds remain.)

## 8. Contact emails (content, optional)
If the domain change also changes your email addresses, update the hardcoded
contact emails in: `app/privacy/page.tsx`, `app/terms/page.tsx`,
and the env defaults `RESEND_FROM_EMAIL` / `VAPID_CONTACT_EMAIL` on Vercel. Also
verify the new sending domain in Resend.

---

## Post-swap verification
```bash
curl -sI https://NEWDOMAIN/ | grep -i strict-transport      # TLS + headers live
curl -s  https://NEWDOMAIN/ | grep -o '<title>[^<]*</title>'
# OG url reflects the new domain:
curl -s  https://NEWDOMAIN/ | grep -i 'og:url'
```
- Log in on the new domain; run an assessment; confirm Stripe checkout (test mode)
  success/cancel URLs land on `NEWDOMAIN`.
- New mobile build: confirm assessments + the upgrade screen open `NEWDOMAIN`.

## Files that reference the URL (all already parameterized)
- Web: `NEXT_PUBLIC_APP_URL` (env) — used by `app/layout.tsx` (`metadataBase`,
  `og:url`), `lib/stripe.ts` checkout URLs, `lib/email.ts` links, etc.
- Mobile: `lib/config.ts` (`API_URL`, `UPGRADE_URL`) ← `EXPO_PUBLIC_API_URL`,
  consumed by `lib/api.ts`, `components/AuthProvider.tsx`,
  `app/(tabs)/settings.tsx`, `app/upgrade.tsx`.
- CI: GitHub secret `PAWCHECK_APP_URL`.
