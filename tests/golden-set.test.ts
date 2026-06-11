import { describe, it, expect } from 'vitest'
import { detectEmergencyIndicators } from '@/lib/emergency'
import golden from '@/eval/golden-set.json'

/**
 * Non-API-dependent portion of the accuracy eval (Part C). Validates the golden
 * set's integrity and the deterministic emergency tripwire. The full,
 * model-in-the-loop eval lives in scripts/eval-assessment.mjs (needs a funded key).
 */

type Case = {
  id: string
  category: string
  description: string
  expected_urgency_band: string
  expected_mode: string
}
const cases = golden as Case[]

describe('golden set integrity', () => {
  it('has a substantial set with required fields', () => {
    expect(cases.length).toBeGreaterThanOrEqual(38)
    for (const c of cases) {
      expect(typeof c.id).toBe('string')
      expect(typeof c.description).toBe('string')
      expect(['green', 'yellow', 'red']).toContain(c.expected_urgency_band)
      expect(['final', 'clarify']).toContain(c.expected_mode)
    }
  })

  it('HARD RULE: every emergency and toxin case expects red + final', () => {
    for (const c of cases.filter((c) => ['emergency', 'toxin'].includes(c.category))) {
      expect(c.expected_urgency_band, c.id).toBe('red')
      expect(c.expected_mode, c.id).toBe('final')
    }
  })

  it('ambiguous cases expect clarify', () => {
    for (const c of cases.filter((c) => c.category === 'ambiguous')) {
      expect(c.expected_mode, c.id).toBe('clarify')
    }
  })
})

describe('emergency tripwire (deterministic safety net)', () => {
  const emergencyish = cases.filter((c) => ['emergency', 'toxin'].includes(c.category))

  it('fires on every toxin-ingestion case', () => {
    for (const c of cases.filter((c) => c.category === 'toxin')) {
      expect(detectEmergencyIndicators(c.description), c.id).toBe(true)
    }
  })

  it('catches the large majority of emergencies', () => {
    const fired = emergencyish.filter((c) => detectEmergencyIndicators(c.description))
    // The model is the primary triage; this deterministic net backstops it.
    expect(fired.length / emergencyish.length).toBeGreaterThanOrEqual(0.85)
  })

  it('does not over-fire on clearly-minor cases', () => {
    const minor = cases.filter((c) => c.category === 'minor')
    const fp = minor.filter((c) => detectEmergencyIndicators(c.description))
    expect(fp.length).toBeLessThanOrEqual(1)
  })
})
