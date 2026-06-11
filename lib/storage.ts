/**
 * Pet-photo storage helpers.
 *
 * pet-photos is a PRIVATE bucket (migration 008). We store the object PATH
 * ({uid}/{file}) in queries.photo_url and mint short-lived signed URLs on read.
 * These helpers also accept legacy values that were stored as full public URLs,
 * so old rows keep rendering after the bucket was flipped private.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'pet-photos'

/** Extract the storage object path from a stored value (path or legacy URL). */
export function petPhotoPath(stored: string | null | undefined): string | null {
  if (!stored) return null
  const marker = `/${BUCKET}/`
  const idx = stored.indexOf(marker)
  if (idx !== -1) {
    // Legacy full URL: .../object/public/pet-photos/{uid}/{file}[?query]
    return stored.slice(idx + marker.length).split('?')[0]
  }
  if (/^https?:\/\//i.test(stored)) return null // a URL but not a pet-photos one
  return stored.replace(/^\/+/, '') // already a path
}

/** Mint a signed URL for a single stored photo value. Returns null on failure. */
export async function signPetPhoto(
  supabase: SupabaseClient,
  stored: string | null | undefined,
  expiresIn = 3600
): Promise<string | null> {
  const path = petPhotoPath(stored)
  if (!path) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error || !data) return null
  return data.signedUrl
}

/**
 * Sign many photos at once. Returns a map keyed by the ORIGINAL stored value
 * so callers can look results up by `row.photo_url`.
 */
export async function signPetPhotos(
  supabase: SupabaseClient,
  stored: Array<string | null | undefined>,
  expiresIn = 3600
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const pairs = stored
    .filter((s): s is string => !!s)
    .map((s) => ({ original: s, path: petPhotoPath(s) }))
    .filter((p): p is { original: string; path: string } => !!p.path)
  if (pairs.length === 0) return out

  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(pairs.map((p) => p.path), expiresIn)
  if (!data) return out

  data.forEach((d, i) => {
    if (d.signedUrl) out.set(pairs[i].original, d.signedUrl)
  })
  return out
}
