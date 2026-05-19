'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeletePetButton({
  petId,
  petName,
}: {
  petId: string
  petName: string
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('pets').delete().eq('id', petId)
    router.push('/pets')
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-ink-soft">
          Delete <strong>{petName}</strong> and all data?
        </span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-4 py-2 bg-urgency-red text-cream-100 rounded-lg text-sm font-medium hover:bg-urgency-red/90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Yes, delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-4 py-2 text-ink-mute hover:text-ink text-sm"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-2 px-3 py-2 text-sm text-ink-mute hover:text-urgency-red transition-colors"
    >
      <Trash2 className="w-4 h-4" />
      Delete pet
    </button>
  )
}
