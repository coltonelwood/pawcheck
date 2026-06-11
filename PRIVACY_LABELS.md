# PawCheck — Apple Privacy "Nutrition Label" Answers

Based on a code audit (not guesses) of what the app actually collects as of v1.0.0.
Answer App Store Connect → App Privacy with the following.

**Top-level:** Does this app collect data? **Yes.**
**Does the app use data to track you?** **No** — there is no IDFA, no third-party
ad/analytics SDK, no cross-app/website tracking. (No App Tracking Transparency
prompt is required.) So for every item below, "Used for Tracking" = **No**.

---

## Data types COLLECTED (declare these)

### Contact Info → Email Address
- Collected: **Yes** · Linked to user: **Yes** · Tracking: **No**
- Purpose: **App Functionality** (account creation / login).
- Source: `profiles.email` (Supabase Auth).

### User Content → Photos or Videos
- Collected: **Yes** · Linked: **Yes** · Tracking: **No**
- Purpose: **App Functionality** (the photo is analyzed to produce the
  assessment; community photos appear in the social feed).
- Source: `pet-photos` / `community-photos` storage buckets.

### User Content → Other User Content
- Collected: **Yes** · Linked: **Yes** · Tracking: **No**
- Purpose: **App Functionality**
- What: free-text symptom descriptions, guided questionnaire answers, pet
  profiles (name, breed, age, weight, known conditions, medications), assessment
  results/history, community posts & comments. Source: `queries`, `pets`,
  `community_*` tables.
- NOTE on "Health & Fitness": Apple's Health & Fitness category covers the
  **user's** health data. PawCheck handles **pet** health information, which is
  the user's content about an animal — declare it as User Content, **not** Health
  & Fitness. (If a reviewer asks, this is the correct mapping.)

### Location → Precise Location  (and Coarse Location)
- Collected: **Yes** · Linked: **No** · Tracking: **No**
- Purpose: **App Functionality** only — the device location (or a ZIP you enter)
  is used to search for nearby veterinarians/emergency hospitals. It is sent to
  the search at request time and is **not stored** against your account, so mark
  it **Not Linked to You**. Declare both Precise (GPS for "near me") and Coarse
  (ZIP fallback).

### Identifiers → User ID
- Collected: **Yes** · Linked: **Yes** · Tracking: **No**
- Purpose: **App Functionality** (the account identifier that ties your pets and
  assessments to you).

### Other Data Types → (push notification token)
- Collected: **Yes** · Linked: **Yes** · Tracking: **No**
- Purpose: **App Functionality** (deliver vaccine reminders / notifications).
- Source: `expo_push_tokens`. Describe as "Push notification device token."

---

## Data types NOT collected (do NOT declare)
- **Financial Info / Purchases / Payment Info** — payment happens on our website
  in a browser (Stripe); the app never sees card or purchase data.
- **Health & Fitness** — see note above (pet, not user, health → User Content).
- **Usage Data / Analytics / Product Interaction** — no analytics SDK is
  integrated. (If you later add PostHog/etc., update this to declare Product
  Interaction → Analytics.)
- **Diagnostics / Crash Data** — none collected by the app today.
- **Browsing History, Search History, Sensitive Info, Contacts, Audio, Gameplay,
  Customer Support content** — none.
- **Advertising Data / IDFA** — none; no ads.

---

## Third-party processors (for your Privacy Policy, not the label picker)
These receive data to provide functionality (processors, not "tracking"):
- **Anthropic (Claude API)** — receives the pet photo + symptom text to generate
  the assessment.
- **Supabase** — database, auth, and photo storage (hosts all of the above).
- **Google Places** — receives the location/ZIP to return nearby vets.
- **Stripe** — payment (on the website, not in-app).
- **Resend** — transactional email (reminders, etc.).
Make sure these are named in the Privacy Policy's "who we share with" section.

## Account deletion
The app provides in-app account deletion (Settings → Delete account), which
removes the account and all associated data — required by Apple Guideline
5.1.1(v). Reference this in the privacy questionnaire if asked.
