/**
 * Per-IP rate limiting for the paid/abuse-prone endpoints, complementing the
 * per-user limits in lib/rate-limit.ts. Fails CLOSED — a counter error blocks
 * rather than letting an unmetered flood through.
 *
 * Backed by the consume_ip_rate() RPC (migration 009) via the service client.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'

export const IP_LIMITS = {
  analyze: { window_minutes: 60, max: 150 },
  training: { window_minutes: 1440, max: 40 },
  nutrition: { window_minutes: 1440, max: 40 },
  vets: { window_minutes: 60, max: 120 },
  auth: { window_minutes: 60, max: 30 },
} as const

export type IpLimitKey = keyof typeof IP_LIMITS

export interface IpRateResult {
  allowed: boolean
  limit: number
  used: number
  retry_after_seconds?: number
}

/** Extract the client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

export async function checkIpRateLimit(
  request: Request,
  key: IpLimitKey
): Promise<IpRateResult> {
  const cfg = IP_LIMITS[key]
  const ip = clientIp(request)
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.rpc('consume_ip_rate', {
      p_ip: ip,
      p_route: key,
      p_window_minutes: cfg.window_minutes,
    })
    if (error) throw new Error(error.message)
    const used = (data as number) ?? 0
    const allowed = used <= cfg.max
    return {
      allowed,
      limit: cfg.max,
      used,
      ...(allowed ? {} : { retry_after_seconds: cfg.window_minutes * 60 }),
    }
  } catch (err: any) {
    // Fail CLOSED.
    console.error(`IP rate limit failed for ${key}:`, err.message)
    return { allowed: false, limit: cfg.max, used: cfg.max, retry_after_seconds: cfg.window_minutes * 60 }
  }
}
