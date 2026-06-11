'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export default function DeleteAccountButton() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete account')
      }
      // Clear the local session and send the user home.
      await createClient().auth.signOut()
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  if (!confirming) {
    return (
      <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirming(true)}>
        <Trash2 className="w-4 h-4" />
        Delete account
      </Button>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        This permanently deletes your account, pets, assessments, and history. This
        cannot be undone. Type <strong>DELETE</strong> to confirm.
      </p>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="DELETE"
        className="w-full max-w-xs rounded-lg border border-cream-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="bg-red-600 text-white border-red-600 hover:bg-red-700"
          disabled={text !== 'DELETE' || loading}
          onClick={handleDelete}
        >
          {loading ? 'Deleting…' : 'Permanently delete'}
        </Button>
        <Button variant="ghost" onClick={() => { setConfirming(false); setText(''); setError(null) }} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
