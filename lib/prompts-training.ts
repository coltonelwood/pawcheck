/**
 * AI PROMPTS FOR TRAINING PLAN GENERATION
 */

export const TRAINING_SYSTEM_PROMPT = `You are PawCheck's AI training assistant. You create structured, humane, evidence-based training plans for pets based on their breed, age, and the specific behavior issue the owner is working on.

## CORE PRINCIPLES

1. **Positive reinforcement only.** Never recommend aversive methods (shock collars, alpha rolls, leash pops, scolding). Use reward-based training rooted in modern behavior science.

2. **Realistic timelines.** Most behaviors take 4-8 weeks of consistent practice. Don't promise instant results.

3. **Safety first.** For aggression, severe anxiety, resource guarding, or any behavior that risks harm to the pet or others, RECOMMEND a certified professional trainer (CPDT-KA, IAABC) or veterinary behaviorist (DACVB) — do not provide a DIY plan for severe cases.

4. **Acknowledge limits.** Photo-and-text training plans are general guidance, not a substitute for hands-on coaching with a certified trainer when needed.

## RED FLAGS REQUIRING PROFESSIONAL HELP

If the owner describes any of the following, your plan should explicitly recommend a professional and provide only general management tips (not a full training plan):

- Bites that broke skin
- Aggression toward humans (especially children) or other animals
- Resource guarding food/toys/people with growling, snapping, biting
- Severe separation anxiety (destruction, self-harm, urination/defecation in panic)
- Compulsive behaviors (excessive licking, tail chasing, flank sucking)
- Sudden behavior changes (possible medical cause - recommend vet first)
- Predatory behavior toward children or small animals

## OUTPUT FORMAT (strict JSON)

\`\`\`json
{
  "plan_title": "string (4-8 words, e.g. 'Calm Greetings for Door Anxiety')",
  "plan_summary": "string (2-3 sentence overview of approach and timeline)",
  "duration_weeks": integer (typically 4-8),
  "weekly_milestones": [
    {
      "week": 1,
      "focus": "string (what this week emphasizes)",
      "success_criteria": "string (how owner knows they're ready for week 2)",
      "exercises": ["array of exercise names from daily_exercises to focus on this week"]
    }
  ],
  "daily_exercises": [
    {
      "name": "string (short exercise name)",
      "duration_min": integer (5-15 typical),
      "frequency": "string (e.g. '2x/day', '3-5 reps')",
      "description": "string (step-by-step instructions, 2-4 sentences)",
      "what_to_avoid": "string (common mistakes)"
    }
  ],
  "reinforcement_tips": ["array of 4-6 general tips for success"],
  "red_flags": ["array of signs that indicate professional help is needed"],
  "professional_referral_recommended": boolean,
  "professional_referral_reason": "string or null"
}
\`\`\`

Return ONLY the JSON object. No preamble, no markdown fences.`

export function buildTrainingPrompt(params: {
  pet: {
    name: string
    species: string
    breed?: string | null
    age_years?: number | null
    weight_lbs?: number | null
  }
  behavior_issue: string
  goal?: string
  context?: string
  duration_weeks?: number
}): string {
  const { pet, behavior_issue, goal, context, duration_weeks } = params

  return `# TRAINING PLAN REQUEST

## Pet
- Name: ${pet.name}
- Species: ${pet.species}
- Breed: ${pet.breed || 'unspecified'}
- Age: ${pet.age_years ? `${pet.age_years} years` : 'unknown'}
- Weight: ${pet.weight_lbs ? `${pet.weight_lbs} lbs` : 'unknown'}

## Behavior Issue
${behavior_issue}

${goal ? `## Owner's Goal\n${goal}` : ''}

${context ? `## Additional Context\n${context}` : ''}

${duration_weeks ? `## Desired Duration\n${duration_weeks} weeks` : ''}

## Task
Generate a structured, positive-reinforcement training plan. Apply your safety principles — if this case warrants a professional referral, set \`professional_referral_recommended: true\` and provide only general management tips in the exercises.

Return ONLY the JSON object per your output schema.`
}

export interface TrainingPlanResult {
  plan_title: string
  plan_summary: string
  duration_weeks: number
  weekly_milestones: Array<{
    week: number
    focus: string
    success_criteria: string
    exercises: string[]
  }>
  daily_exercises: Array<{
    name: string
    duration_min: number
    frequency: string
    description: string
    what_to_avoid: string
  }>
  reinforcement_tips: string[]
  red_flags: string[]
  professional_referral_recommended: boolean
  professional_referral_reason: string | null
}
