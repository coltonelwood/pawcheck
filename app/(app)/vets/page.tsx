'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { ArrowLeft, MapPin, Phone, Globe, Star, Loader2, AlertCircle, Navigation, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Vet {
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
  is_emergency: boolean
}

export default function VetFinderPage() {
  const [vets, setVets] = useState<Vet[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zipCode, setZipCode] = useState('')
  const [emergencyOnly, setEmergencyOnly] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    async function loadSavedLocation() {
      setLoading(true)
      const supabase = createClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('zip_code, location_lat, location_lng')
        .single()

      if (profile?.zip_code) setZipCode(profile.zip_code)
      
      // Auto-search if we have saved coordinates
      if (profile?.location_lat && profile?.location_lng) {
        await search({ lat: Number(profile.location_lat), lng: Number(profile.location_lng) })
      }
      setLoading(false)
    }
    loadSavedLocation()
  }, [])

  async function search(params: { lat?: number; lng?: number; zip_code?: string } = {}) {
    setSearching(true)
    setError(null)
    try {
      const res = await fetch('/api/vets/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          emergency_only: emergencyOnly,
          radius_miles: 25,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setVets(data.vets || [])
      setHasSearched(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSearching(false)
    }
  }

  function handleZipSearch(e: React.FormEvent) {
    e.preventDefault()
    if (zipCode.trim()) search({ zip_code: zipCode.trim() })
  }

  async function useDeviceLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser')
      return
    }
    setSearching(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        search({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => {
        setError(`Location error: ${err.message}`)
        setSearching(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  if (loading) {
    return (
      <div className="container py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-forest-600" />
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8 lg:py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold text-ink leading-tight">
          Find a vet
        </h1>
        <p className="mt-2 text-ink-mute">
          Veterinarians and emergency hospitals near you.
        </p>
      </div>

      {/* Search controls */}
      <div className="bg-card rounded-2xl border border-cream-300/60 p-6 mb-6">
        <form onSubmit={handleZipSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="zip">Zip code</Label>
            <Input
              id="zip"
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="81401"
              pattern="[0-9]{5}"
            />
          </div>
          <div className="flex flex-col gap-2 justify-end">
            <Label>&nbsp;</Label>
            <Button type="submit" variant="default" disabled={searching}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </Button>
          </div>
        </form>

        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={useDeviceLocation}
            disabled={searching}
            className="text-sm text-forest-600 hover:underline inline-flex items-center gap-1"
          >
            <Navigation className="w-3.5 h-3.5" />
            Use my current location
          </button>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={emergencyOnly}
              onChange={(e) => setEmergencyOnly(e.target.checked)}
              className="w-4 h-4 rounded border-forest-600/30 text-forest-600 focus:ring-forest-600/20"
            />
            <span className="text-ink">Emergency vets only</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-urgency-red/10 border border-urgency-red/20 rounded-lg text-sm text-urgency-red mb-6">
          {error}
        </div>
      )}

      {/* Results */}
      {searching ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-forest-600" />
        </div>
      ) : hasSearched && vets.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-cream-300 p-12 text-center">
          <MapPin className="w-12 h-12 mx-auto text-ink-mute mb-3" strokeWidth={1.5} />
          <p className="text-ink-mute">No vets found nearby. Try a wider search.</p>
        </div>
      ) : hasSearched ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-mute">
            Found <strong className="text-ink tabular-nums">{vets.length}</strong> veterinarians
          </p>
          {vets.map((vet) => (
            <div
              key={vet.place_id}
              className={`bg-card rounded-2xl border p-5 transition-all hover:shadow-md ${
                vet.is_emergency ? 'border-urgency-red/30 bg-red-50/20' : 'border-cream-300/60'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-display text-xl font-semibold text-ink">
                      {vet.name}
                    </h3>
                    {vet.is_emergency && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-urgency-red text-xs font-semibold border border-red-200">
                        <AlertCircle className="w-3 h-3" />
                        Emergency
                      </span>
                    )}
                    {vet.open_now !== null && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          vet.open_now
                            ? 'bg-forest-50 text-forest-700 border border-forest-200'
                            : 'bg-cream-200 text-ink-mute'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {vet.open_now ? 'Open now' : 'Closed'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink-mute mb-2">{vet.address}</p>
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    {vet.distance_miles !== null && (
                      <span className="text-ink-soft tabular-nums">
                        {vet.distance_miles} mi
                      </span>
                    )}
                    {vet.rating !== null && (
                      <span className="inline-flex items-center gap-1 text-ink-soft">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="tabular-nums">{vet.rating}</span>
                        <span className="text-ink-mute">
                          ({vet.user_ratings_total ?? 0})
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-cream-300/40">
                {vet.phone && (
                  <a
                    href={`tel:${vet.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-forest-600 text-cream-100 rounded-lg text-sm font-medium hover:bg-forest-700 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {vet.phone}
                  </a>
                )}
                {vet.website && (
                  <a
                    href={vet.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cream-200 text-ink rounded-lg text-sm font-medium hover:bg-cream-300 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Website
                  </a>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}&destination_place_id=${vet.place_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cream-200 text-ink rounded-lg text-sm font-medium hover:bg-cream-300 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Directions
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-dashed border-cream-300 p-12 text-center">
          <MapPin className="w-12 h-12 mx-auto text-ink-mute mb-3" strokeWidth={1.5} />
          <p className="text-ink-mute">Enter a zip code or use your current location to search</p>
        </div>
      )}
    </div>
  )
}
