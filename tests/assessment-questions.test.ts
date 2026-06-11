import { describe, it, expect } from 'vitest'
import { composeGuidedSummary, getCategory, SYMPTOM_CATEGORIES } from '@/lib/assessment-questions'

describe('guided assessment composition', () => {
  it('composes answers into a clinical summary', () => {
    const summary = composeGuidedSummary({
      category: 'digestion',
      answers: { duration: '1–2 days', frequency: '3–5', blood: true, still_eating: false },
    })
    expect(summary).toContain('Vomiting, diarrhea, or stool')
    expect(summary).toContain('1–2 days')
    expect(summary).toContain('Yes') // blood: true
    expect(summary).toContain('No') // still_eating: false
  })

  it('adds an emergency note for emergency categories', () => {
    const summary = composeGuidedSummary({
      category: 'ingestion',
      answers: { what: 'chocolate', when: 'Within the hour' },
    })
    expect(summary.toLowerCase()).toContain('time-critical')
  })

  it('omits unanswered follow-ups and unknown categories', () => {
    const partial = composeGuidedSummary({ category: 'movement', answers: { duration: '3–7 days' } })
    expect(partial).toContain('3–7 days')
    expect(composeGuidedSummary({ category: 'nope', answers: {} })).toBe('')
  })

  it('every category has a stable id and label', () => {
    for (const c of SYMPTOM_CATEGORIES) {
      expect(c.id).toBeTruthy()
      expect(getCategory(c.id)).toBe(c)
    }
  })
})
