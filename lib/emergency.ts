/**
 * Emergency tripwire.
 *
 * A deterministic, server-side keyword scan over the owner's input. When it
 * fires we (a) tell the model an emergency may be present so it returns a final
 * red result, and (b) hard-override any stray "clarify" response into an
 * emergency final — a panicking owner must never be asked quiz questions.
 *
 * This is a SAFETY NET, intentionally biased toward over-triggering. It does not
 * replace the model's own red-flag judgment; it backstops it.
 */

// Substances that are dangerous if eaten — fire when paired with an ingestion verb.
const TOXIN_SUBSTANCE =
  /\b(chocolate|cocoa|grapes?|raisins?|xylitol|sugar[- ]free (gum|candy)|antifreeze|ethylene glycol|rat (poison|bait)|rodenticide|mouse (poison|bait)|lil(y|ies)|sago palm|azalea|rhododendron|oleander|tulip|daffodil|ibuprofen|advil|motrin|tylenol|acetaminophen|paracetamol|aspirin|naproxen|aleve|nsaids?|macadamia|onions?|garlic|marijuana|cannabis|thc|weed|gummy vitamins?|pills?|medication|tablets?|poison|bleach|detergent|cleaner)\b/i
const INGESTION_VERB =
  /\b(ate|eaten|eating|ingest\w*|swallow\w*|chew\w*|lick\w*|got ?(into|in|ahold)|gotten into|snatch\w*|gobbl\w*|gulp\w*|consum\w*|drank|gave (her|him|my|the)|into a (bag|pack|bottle|box|container)|off the (counter|floor|table))/i

const EMERGENCY_PATTERNS: RegExp[] = [
  // Respiratory
  /\bbreath(e|ing)?\b.{0,25}\b(hard|heavy|heavily|fast|rapid|difficult|trouble|labou?red|struggl|funny|weird|open ?mouth)\b/i,
  /\b(hard|trouble|difficulty|struggling|unable|can'?t|cannot|not)\b.{0,15}\bbreath/i,
  /\bopen[- ]?mouth(ed)? breathing\b/i,
  /\b(blue|bluish|purple|pale|white|grey|gray)\b.{0,15}\b(gums?|tongue|lips)\b/i,
  /\b(gums?|tongue)\b.{0,15}\b(blue|bluish|purple|pale|white)\b/i,
  /\b(choking|gasping|wheez)/i,
  // Neuro / collapse
  /\b(seizure|seizing|convuls|fitting|paddling (her|his|its) legs)\b/i,
  /\b(collaps|unconscious|unresponsive|barely responsive|passed out|won'?t wake|limp and (un)?responsive|lying on (his|her|its) side)\b/i,
  // Bloat / GI emergency
  /\bbloat/i,
  /\b(belly|abdomen|stomach|tummy)\b.{0,25}\b(huge|swollen|distend|bloat|hard|tight|enlarged|big)\b/i,
  /\b(swollen|distended|hard|tight|huge)\b.{0,15}\b(belly|abdomen|stomach|tummy)\b/i,
  /\b(retch|vomit|throw(ing)? up|gag)\b.{0,30}\b(nothing (comes|came) (out|up)|but nothing|without|unproductive)\b/i,
  /\b(trying|tries|keeps trying)\b.{0,25}\b(throw up|vomit|be sick)\b.{0,25}\bnothing\b/i,
  // Urinary blockage
  /\bstrain/i,
  /\b(litter box|to (pee|urinate|wee))\b.{0,30}\bnothing (comes|came) out\b/i,
  /\b(can'?t|cannot|unable to|trouble|trying to)\b.{0,12}\b(pee|urinat|wee|pass urine)\b/i,
  /\b(blocked|can'?t pass urine)\b/i,
  // Trauma / eye / bleeding / heat
  /\b(hit by (a )?car|hbc|fell (from|off)|attacked|mauled|in a fight|scuffle)\b/i,
  /\b(eye ?ball|eye)\b.{0,20}\b(bulging|popping|popped|out of (the|its) socket|prolaps)\b/i,
  /\b(bleeding|blood)\b.{0,30}\b(won'?t stop|wo n'?t stop|a lot|heavily|badly|everywhere|pouring|gushing|soaking|pooling|all over)\b/i,
  /\b(losing (a lot of )?blood|hemorrhag|won'?t stop bleeding)\b/i,
  /\b(heat ?stroke|overheat|panting (non ?stop|heavily|excessively)|collapsed? in the (heat|sun|car))\b/i,
  // Severe constitutional
  /\b(vomiting blood|blood in (the )?(vomit|stool|urine)|bloody (vomit|diarrh?ea|stool|urine)|coffee[- ]ground)\b/i,
  /\b(antifreeze|poisoned|overdose)\b/i,
]

export function detectEmergencyIndicators(...texts: Array<string | null | undefined>): boolean {
  const blob = texts.filter(Boolean).join(' \n ')
  if (!blob.trim()) return false
  // Toxin ingestion: a dangerous substance + an ingestion verb anywhere in the text.
  if (TOXIN_SUBSTANCE.test(blob) && INGESTION_VERB.test(blob)) return true
  return EMERGENCY_PATTERNS.some((re) => re.test(blob))
}

/** A safe emergency FINAL result used to override any stray clarify response. */
export function emergencyFallbackResult(petName: string) {
  return {
    mode: 'final' as const,
    urgency: 'red' as const,
    urgency_label: 'Vet immediately',
    description_summary: `${petName}'s description includes a possible emergency sign. This needs urgent, in-person veterinary evaluation now.`,
    likely_causes: [
      {
        name: 'Potential emergency',
        probability: 'high' as const,
        explanation:
          'The reported signs can indicate a life-threatening problem that cannot be safely assessed remotely.',
      },
    ],
    recommended_action:
      'Contact your veterinarian or the nearest emergency animal hospital immediately. If a toxin may be involved, also call an animal poison control center on the way.',
    vet_visit: 'immediate' as const,
    confidence_score: 40,
    grounding_confidence: 'none' as const,
    red_flags: [
      'Difficulty breathing or pale/blue gums',
      'Collapse, seizures, or unresponsiveness',
      'Inability to urinate (especially male cats)',
      'Bloated/hard abdomen or unproductive retching',
    ],
    followup_questions: [
      'When did the signs start?',
      'Could your pet have eaten anything toxic?',
      'Is your pet still alert and responsive?',
    ],
    disclaimer:
      'This is informational only and not veterinary medical advice. Always consult a licensed veterinarian for diagnosis and treatment of your pet’s condition.',
  }
}
