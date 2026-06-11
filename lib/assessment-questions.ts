/**
 * Guided-assessment questionnaire definitions.
 *
 * Shared shape used by web + mobile (kept in sync in both repos). The analyze
 * route composes the answers into a clinical-style summary for the AI prompt,
 * and stores the raw structured answers on the assessment.
 *
 * Categories flagged `emergency` bias urgency upward and surface the
 * emergency-vet CTA prominently.
 */

export type FollowUpType = 'select' | 'boolean' | 'text'

export interface FollowUp {
  id: string
  label: string
  type: FollowUpType
  options?: string[] // for 'select'
  placeholder?: string // for 'text'
}

export interface SymptomCategory {
  id: string
  label: string
  emoji: string
  emergency?: boolean
  followUps: FollowUp[]
}

const DURATION = {
  id: 'duration',
  label: 'How long has this been going on?',
  type: 'select' as const,
  options: ['Less than a day', '1–2 days', '3–7 days', 'Over a week'],
}

export const SYMPTOM_CATEGORIES: SymptomCategory[] = [
  {
    id: 'eating_drinking',
    label: 'Eating or drinking',
    emoji: '🍽️',
    followUps: [
      DURATION,
      { id: 'appetite', label: 'Appetite', type: 'select', options: ['Eating more', 'Eating less', 'Not eating at all', 'Normal'] },
      { id: 'drinking', label: 'Drinking', type: 'select', options: ['Drinking more', 'Drinking less', 'Not drinking', 'Normal'] },
    ],
  },
  {
    id: 'digestion',
    label: 'Vomiting, diarrhea, or stool',
    emoji: '🤢',
    followUps: [
      DURATION,
      { id: 'frequency', label: 'How many times in the last 24 hours?', type: 'select', options: ['1–2', '3–5', '6 or more'] },
      { id: 'blood', label: 'Any blood present?', type: 'boolean' },
      { id: 'still_eating', label: 'Still eating and drinking?', type: 'boolean' },
    ],
  },
  {
    id: 'movement',
    label: 'Limping or trouble moving',
    emoji: '🦴',
    followUps: [
      DURATION,
      { id: 'location', label: 'Which area?', type: 'select', options: ['Front leg', 'Back leg', 'Multiple legs', 'Back/spine', 'Not sure'] },
      { id: 'weight_bearing', label: 'Can they put weight on it?', type: 'boolean' },
    ],
  },
  {
    id: 'skin',
    label: 'Skin, coat, or itching',
    emoji: '🐾',
    followUps: [
      DURATION,
      { id: 'location', label: 'Where on the body?', type: 'text', placeholder: 'e.g. left ear, belly, base of tail' },
      { id: 'severity', label: 'How severe?', type: 'select', options: ['Mild', 'Moderate', 'Severe / raw or bleeding'] },
    ],
  },
  {
    id: 'breathing',
    label: 'Breathing trouble',
    emoji: '🫁',
    emergency: true,
    followUps: [
      { id: 'duration', label: 'How long?', type: 'select', options: ['Just now / minutes', 'Hours', 'A day or more'] },
      { id: 'severity', label: 'How is the breathing?', type: 'select', options: ['Fast', 'Labored / struggling', 'Coughing', 'Wheezing'] },
      { id: 'gum_color', label: 'Gum color', type: 'select', options: ['Pink (normal)', 'Pale', 'Blue/grey', 'Not sure'] },
    ],
  },
  {
    id: 'behavior',
    label: 'Behavior or energy change',
    emoji: '😟',
    followUps: [
      DURATION,
      { id: 'change', label: 'What changed?', type: 'select', options: ['Lethargic / very tired', 'Restless / agitated', 'Hiding', 'Whining / vocalizing', 'Other'] },
      { id: 'eating_normally', label: 'Eating normally?', type: 'boolean' },
    ],
  },
  {
    id: 'ingestion',
    label: 'Ate something they shouldn’t have',
    emoji: '⚠️',
    emergency: true,
    followUps: [
      { id: 'what', label: 'What did they eat?', type: 'text', placeholder: 'e.g. chocolate, a sock, a plant, medication' },
      { id: 'when', label: 'How long ago?', type: 'select', options: ['Within the hour', '1–6 hours ago', 'Over 6 hours ago', 'Not sure'] },
      { id: 'amount', label: 'Roughly how much?', type: 'text', placeholder: 'e.g. a few pieces, a whole bar' },
      { id: 'symptoms_now', label: 'Showing any symptoms now?', type: 'boolean' },
    ],
  },
  {
    id: 'other',
    label: 'Something else',
    emoji: '❓',
    followUps: [],
  },
]

export function getCategory(id: string): SymptomCategory | undefined {
  return SYMPTOM_CATEGORIES.find((c) => c.id === id)
}

export interface GuidedAnswers {
  category: string
  answers: Record<string, string | boolean>
}

/** Compose guided answers into a clinical-style summary for the AI prompt. */
export function composeGuidedSummary(guided: GuidedAnswers): string {
  const cat = getCategory(guided.category)
  if (!cat) return ''
  const lines: string[] = [`Concern category: ${cat.label}.`]
  for (const fu of cat.followUps) {
    const val = guided.answers[fu.id]
    if (val === undefined || val === '') continue
    const display = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val
    lines.push(`- ${fu.label} ${display}`)
  }
  if (cat.emergency) {
    lines.push(
      'NOTE: this category is potentially time-critical — weigh emergency causes and err toward urgency if red flags are present.'
    )
  }
  return lines.join('\n')
}
