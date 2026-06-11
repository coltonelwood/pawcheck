import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchNearbyVets, geocodeZip } from '@/lib/google-places'
import { checkIpRateLimit } from '@/lib/ip-rate-limit'
import { z } from 'zod'

export const maxDuration = 30

const RequestSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  zip_code: z.string().optional(),
  radius_miles: z.number().min(1).max(50).optional(),
  emergency_only: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ipRl = await checkIpRateLimit(request, 'vets')
    if (!ipRl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests from your network. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipRl.retry_after_seconds ?? 3600) } }
      )
    }

    const body = await request.json()
    const validation = RequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    let { lat, lng, zip_code, radius_miles, emergency_only } = validation.data

    // If no coords, try to use saved location or geocode zip
    if (!lat || !lng) {
      if (zip_code) {
        const coords = await geocodeZip(zip_code)
        if (!coords) {
          return NextResponse.json(
            { error: 'Could not geocode zip code' },
            { status: 400 }
          )
        }
        lat = coords.lat
        lng = coords.lng

        // Save to profile for next time
        await supabase
          .from('profiles')
          .update({
            zip_code,
            location_lat: lat,
            location_lng: lng,
          })
          .eq('id', user.id)
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('location_lat, location_lng, zip_code')
          .eq('id', user.id)
          .single()

        if (profile?.location_lat && profile?.location_lng) {
          lat = Number(profile.location_lat)
          lng = Number(profile.location_lng)
        } else {
          return NextResponse.json(
            { error: 'Location required. Provide lat/lng or zip_code.' },
            { status: 400 }
          )
        }
      }
    }

    const radius_meters = (radius_miles || 10) * 1609.34

    const vets = await searchNearbyVets({
      lat: lat!,
      lng: lng!,
      radius_meters,
      emergency_only,
    })

    // Sort by distance, then emergency first if emergency_only
    vets.sort((a, b) => {
      if (emergency_only) {
        if (a.is_emergency && !b.is_emergency) return -1
        if (!a.is_emergency && b.is_emergency) return 1
      }
      return (a.distance_miles ?? 9999) - (b.distance_miles ?? 9999)
    })

    return NextResponse.json({ vets, search_location: { lat, lng } })
  } catch (error: any) {
    console.error('Vet search error:', error)
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    )
  }
}
