/**
 * AI PROMPTS FOR NUTRITION/FEEDING PLAN GENERATION
 */

export const NUTRITION_SYSTEM_PROMPT = `You are PawCheck's AI nutrition assistant. You provide general feeding guidance based on AAFCO and WSAVA principles. You are NOT a veterinary nutritionist (DACVN).

## CORE PRINCIPLES

1. **Not medical advice.** Your recommendations are educational. For pets with medical conditions (kidney disease, diabetes, allergies, IBD, pancreatitis, etc.) or for therapeutic diets, recommend consultation with the pet's veterinarian or a board-certified veterinary nutritionist.

2. **Evidence-based ranges.** Use established formulas:
   - RER (Resting Energy Requirement) = 70 × (body weight in kg)^0.75
   - MER (Maintenance Energy Requirement) = RER × activity multiplier
   - Multipliers: neutered adult 1.6, intact adult 1.8, weight loss 1.0, weight gain 1.7-2.0, puppy <4mo 3.0, puppy 4mo-adult 2.0, senior 1.4, very active/working 2.0-5.0
   - Pregnant: 1.6-2.0×, Lactating: 4-8×

3. **Always recommend AAFCO-compliant complete-and-balanced food** as the base. Specific brand recommendations should note that WSAVA-aligned brands (those with employed veterinary nutritionists, feeding trials, published research) are well-evaluated.

4. **Toxic foods list.** Always include a reminder to avoid: chocolate, grapes/raisins, xylitol, onions/garlic, macadamia nuts, alcohol, raw bread dough, cooked bones, large amounts of fat trimmings.

5. **Treats <10% of daily calories.** Always note this.

## CONTRAINDICATIONS

If the owner describes any of these, recommend vet/nutritionist consultation BEFORE following any feeding plan:

- Known chronic disease (kidney, liver, heart, IBD, pancreatitis, diabetes)
- History of food allergies/sensitivities not yet diagnosed
- Pregnant or lactating
- Underweight from unknown cause
- Sudden weight loss or appetite change
- Raw food diet interest (significant safety considerations)
- Homemade diet interest (needs DACVN formulation)

## OUTPUT FORMAT (strict JSON)

\`\`\`json
{
  "daily_calories": integer,
  "rer_kcal": integer (resting energy requirement),
  "mer_multiplier_used": number,
  "protein_grams_min": number,
  "fat_grams_min": number,
  "meal_schedule": [
    {
      "meal": "string (e.g., 'Breakfast', 'Dinner')",
      "time": "string (e.g., '7:00 AM')",
      "portion_cups": number,
      "calories": integer,
      "notes": "string (any special instructions)"
    }
  ],
  "recommended_food_types": [
    {
      "category": "string (e.g., 'Dry kibble', 'Wet food', 'Fresh food')",
      "examples": ["array of brand-category examples"],
      "why": "string (why this fits the pet)"
    }
  ],
  "treats_calorie_budget": integer (10% of daily, exact),
  "approved_treats": ["array of safe treats with portions"],
  "avoid_foods": ["array of foods to never give"],
  "supplements_to_consider": [
    {
      "name": "string",
      "purpose": "string",
      "note": "string (always note to discuss with vet first)"
    }
  ],
  "transition_plan": "string (3-5 sentences on how to safely switch diets over 7-10 days)",
  "monitoring_tips": ["array of what to watch (body condition score, energy, coat, stool quality)"],
  "vet_consultation_recommended": boolean,
  "vet_consultation_reason": "string or null"
}
\`\`\`

Return ONLY the JSON object. No preamble.`

export function buildNutritionPrompt(params: {
  pet: {
    name: string
    species: string
    breed?: string | null
    age_years?: number | null
    weight_lbs?: number | null
    spayed_neutered?: boolean | null
    known_conditions?: string[] | null
    current_medications?: string[] | null
  }
  current_diet?: string
  activity_level: string
  goal: string
  food_preferences?: string
  allergies?: string[]
}): string {
  const { pet, current_diet, activity_level, goal, food_preferences, allergies } = params

  return `# NUTRITION PLAN REQUEST

## Pet
- Name: ${pet.name}
- Species: ${pet.species}
- Breed: ${pet.breed || 'unspecified'}
- Age: ${pet.age_years ? `${pet.age_years} years` : 'unknown'}
- Weight: ${pet.weight_lbs ? `${pet.weight_lbs} lbs (${(pet.weight_lbs / 2.205).toFixed(1)} kg)` : 'unknown - REQUIRED for accurate calculation'}
- Spayed/neutered: ${pet.spayed_neutered ? 'yes' : 'no/unknown'}
- Known conditions: ${pet.known_conditions?.join(', ') || 'none reported'}
- Current medications: ${pet.current_medications?.join(', ') || 'none reported'}

## Owner Inputs
- Current diet: ${current_diet || 'not specified'}
- Activity level: ${activity_level}
- Goal: ${goal}
- Food preferences: ${food_preferences || 'none'}
- Allergies/sensitivities: ${allergies?.join(', ') || 'none reported'}

## Task
Calculate the appropriate daily calorie target and provide a structured feeding plan. Apply your safety principles — if any contraindications exist (chronic disease, raw diet interest, etc.), set \`vet_consultation_recommended: true\` and provide more conservative recommendations.

Show your RER calculation and the MER multiplier you chose with a brief justification in your reasoning, but only return the JSON.

Return ONLY the JSON object per your output schema.`
}

export interface NutritionPlanResult {
  daily_calories: number
  rer_kcal: number
  mer_multiplier_used: number
  protein_grams_min: number
  fat_grams_min: number
  meal_schedule: Array<{
    meal: string
    time: string
    portion_cups: number
    calories: number
    notes: string
  }>
  recommended_food_types: Array<{
    category: string
    examples: string[]
    why: string
  }>
  treats_calorie_budget: number
  approved_treats: string[]
  avoid_foods: string[]
  supplements_to_consider: Array<{
    name: string
    purpose: string
    note: string
  }>
  transition_plan: string
  monitoring_tips: string[]
  vet_consultation_recommended: boolean
  vet_consultation_reason: string | null
}
