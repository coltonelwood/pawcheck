# PawCheck — App Review Notes

Paste the "Notes for the App Reviewer" text below into App Store Connect, and
enter the demo account in the "Sign-In Information" fields.

---

## Demo account (Sign-In Information)
- **Username:** `appreview@purelyticlabs.com`
- **Password:** `PawCheckReview!2026`

This account is **Premium** and pre-loaded with 3 pets (Biscuit, Luna, Pepper)
and 3 sample assessments — including a **red/emergency** result so you can see
the emergency-care UI without entering a real emergency.

> Recreate or refresh it anytime with the seed script (see bottom).

---

## Notes for the App Reviewer (paste this)
```
Thank you for reviewing PawCheck.

WHAT IT DOES
PawCheck gives pet owners instant, AI-assisted guidance on a pet's symptoms. The
user starts an assessment three ways — take a photo, describe the issue in text,
or answer a few guided questions — and receives an urgency level (monitor / see a
vet soon / seek care now), likely causes, and next steps. It is informational
guidance, clearly labeled as NOT a veterinary diagnosis, with prominent emergency
guidance for serious symptoms.

DEMO ACCOUNT
Username: appreview@purelyticlabs.com
Password: PawCheckReview!2026
This account is Premium and already has pets and sample assessments (including an
emergency result) so all features are visible immediately.

HOW TO EXERCISE IT
1. Sign in with the demo account.
2. Open "Assessments" history to see the three sample results, including the red
   "Seek care now" emergency result and its emergency-vet guidance.
3. Tap the center (+) tab to start a new assessment and try any of the three
   inputs: Take a photo, Describe the issue, or Answer questions. (You can use a
   stock photo of a pet for the photo path.)
4. Visit the Vets tab to see the location-based vet finder (allow location, or it
   falls back to a ZIP).
5. Settings shows the Premium subscription, a "Manage billing" link, and the
   required in-app "Delete account" option.

SUBSCRIPTIONS / PAYMENTS
Subscriptions are sold and managed on our website (Stripe), not via In-App
Purchase. Tapping a plan opens our secure web checkout in an in-app browser.
There are no digital In-App Purchases in the app, and no language directing users
away from any purchase method.

MEDICAL DISCLAIMER
Every assessment result and the onboarding clearly state that PawCheck provides
informational guidance only and is not a substitute for veterinary care, and that
emergencies require immediate professional care.

PERMISSIONS
- Camera & Photos: to add a photo of the pet's symptom to an assessment.
- Location (when-in-use only): solely to find nearby veterinarians; never tracked
  in the background.

Account deletion is available in Settings → Delete account (Guideline 5.1.1(v)).

Please reach out with any questions. Thank you!
```

---

## Re-seeding the demo account
Run from the `pawcheck/` web repo (so dependencies resolve):
```bash
cd ~/Desktop/pawcheck-bundle/pawcheck
SUPABASE_URL='https://zsdvpcnldentmlmhtwex.supabase.co' \
SUPABASE_SERVICE_ROLE_KEY='<service-role-key from .secrets/supabase.env>' \
node scripts/seed-review-account.mjs
```
Idempotent — it deletes and recreates the demo user (and all its data) each run.
Override `REVIEW_EMAIL` / `REVIEW_PASSWORD` env vars to change the credentials.

> Note: AI assessment generation requires a funded Anthropic key. The seeded
> sample assessments are pre-populated so reviewers don't depend on live AI, but
> if you want the reviewer to generate a *new* assessment during review, ensure
> the Anthropic account has credit first.
