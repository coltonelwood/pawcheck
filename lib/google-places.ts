/**
 * Google Places API client for finding nearby veterinarians.
 * Requires GOOGLE_PLACES_API_KEY in env.
 * Enable Places API (New) in Google Cloud Console.
 */

export interface VetResult {
  place_id: string
  name: string
  address: string
  lat: number
  lng: number
  rating: number | null
  user_ratings_total: number | null
  phone: string | null
  website: string | null
  open_now: boolean | null
  distance_miles: number | null
  types: string[]
  is_emergency: boolean
}

export async function searchNearbyVets(params: {
  lat: number
  lng: number
  radius_meters?: number
  emergency_only?: boolean
}): Promise<VetResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY not configured')
  }

  const radius = params.radius_meters || 16000 // 10 miles default
  const textQuery = params.emergency_only
    ? 'emergency veterinary hospital'
    : 'veterinarian'

  // Use new Places API (recommended over legacy)
  const url = 'https://places.googleapis.com/v1/places:searchText'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.websiteUri,places.currentOpeningHours,places.types',
    },
    body: JSON.stringify({
      textQuery,
      locationBias: {
        circle: {
          center: { latitude: params.lat, longitude: params.lng },
          radius: radius,
        },
      },
      maxResultCount: 20,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Google Places error:', error)
    throw new Error('Failed to search vets')
  }

  const data = await response.json()
  const places = data.places || []

  return places.map((place: any): VetResult => {
    const lat = place.location?.latitude
    const lng = place.location?.longitude
    const distance =
      lat && lng
        ? calculateDistanceMiles(params.lat, params.lng, lat, lng)
        : null
    const types: string[] = place.types || []
    const name: string = place.displayName?.text || ''
    const isEmergency =
      /emergency|24[\/\s-]?hour|er |urgent/i.test(name) ||
      types.includes('emergency_room')

    return {
      place_id: place.id,
      name,
      address: place.formattedAddress || '',
      lat,
      lng,
      rating: place.rating ?? null,
      user_ratings_total: place.userRatingCount ?? null,
      phone: place.nationalPhoneNumber ?? null,
      website: place.websiteUri ?? null,
      open_now: place.currentOpeningHours?.openNow ?? null,
      distance_miles: distance,
      types,
      is_emergency: isEmergency,
    }
  })
}

export async function geocodeZip(zipCode: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return null

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    zipCode
  )}&key=${apiKey}`

  const response = await fetch(url)
  if (!response.ok) return null

  const data = await response.json()
  const location = data.results?.[0]?.geometry?.location
  if (!location) return null

  return { lat: location.lat, lng: location.lng }
}

function calculateDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}
