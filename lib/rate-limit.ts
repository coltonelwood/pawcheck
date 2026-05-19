/**
 * Rate limiting
 *
 * Uses Supabase RPCs that count recent rows in the relevant table.
 * No external service needed. Limits are conservative ceilings to
 * protect the Anthropic budget and the community from spam — they
 * sit well above what a normal user would ever hit.
 */

import { SupabaseClient } from '@supabase/supabase-js'

export const RATE_LIMITS = {
  // Photo assessments: 30 per hour per user
  analyze: { window_minutes: 60, max: 30, rpc: 'recent_query_count' },
  // Training plan generation: 10 per day per user
  training: { window_hours: 24, max: 10, rpc: 'recent_training_count' },
  // Nutrition plan generation: 10 per day per user
  nutrition: { window_hours: 24, max: 10, rpc: 'recent_nutrition_count' },
  // Community posts: 20 per day per user
  post: { window_hours: 24, max: 20, rpc: 'recent_post_count' },
} as const

export type RateLimitKey = keyof typeof RATE_LIMITS

export interface RateLimitResult {
  allowed: boolean
  limit: number
  used: number
  remaining: number
  retry_after_seconds?: number
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  key: RateLimitKey
): Promise<RateLimitResult> {
  const cfg = RATE_LIMITS[key]
  const args: any = { user_uuid: userId }
  if ('window_minutes' in cfg) args.window_minutes = cfg.window_minutes
  if ('window_hours' in cfg) args.window_hours = cfg.window_hours

  const { data, error } = await supabase.rpc(cfg.rpc as any, args)

  // If the RPC fails, fail open (allow) but log — don't lock users out
  // because of a database hiccup.
  if (error) {
    console.error(`Rate limit RPC failed for ${key}:`, error.message)
    return { allowed: true, limit: cfg.max, used: 0, remaining: cfg.max }
  }

  const used = (data as number) ?? 0
  const allowed = used < cfg.max
  return {
    allowed,
    limit: cfg.max,
    used,
    remaining: Math.max(0, cfg.max - used),
    ...(allowed ? {} : { retry_after_seconds: getRetryAfter(key) }),
  }
}

function getRetryAfter(key: RateLimitKey): number {
  const cfg = RATE_LIMITS[key]
  if ('window_minutes' in cfg) return cfg.window_minutes * 60
  if ('window_hours' in cfg) return cfg.window_hours * 3600
  return 3600
}
