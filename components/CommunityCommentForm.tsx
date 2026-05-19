'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, MessageCircle } from 'lucide-react'

export default function CommunityCommentForm({ postId }: { postId: string }) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/community/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, content: content.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Comment failed')
      }
      setContent('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share your thoughts..."
        rows={3}
        maxLength={5000}
        disabled={submitting}
      />
      {error && (
        <div className="text-sm text-urgency-red">{error}</div>
      )}
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="default"
          size="sm"
          disabled={!content.trim() || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <MessageCircle className="w-3.5 h-3.5" />
              Comment
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
