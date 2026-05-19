'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Trash2 } from 'lucide-react'

export default function CommunityPostActions({
  postId,
  initialLikeCount,
  initialLiked,
  commentCount,
  isOwnPost,
}: {
  postId: string
  initialLikeCount: number
  initialLiked: boolean
  commentCount: number
  isOwnPost: boolean
}) {
  const router = useRouter()
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [pending, setPending] = useState(false)

  async function toggleLike() {
    if (pending) return
    setPending(true)
    
    // Optimistic update
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1))

    try {
      const res = await fetch('/api/community/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
      })
      if (!res.ok) {
        // Revert
        setLiked(!newLiked)
        setLikeCount(prev => newLiked ? prev - 1 : prev + 1)
      }
    } catch {
      setLiked(!newLiked)
      setLikeCount(prev => newLiked ? prev - 1 : prev + 1)
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this post permanently?')) return
    const res = await fetch(`/api/community/post?id=${postId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      router.push('/community')
      router.refresh()
    }
  }

  return (
    <div className="flex items-center justify-between pt-4 border-t border-cream-300/40">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleLike}
          disabled={pending}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            liked
              ? 'bg-red-50 text-urgency-red border border-red-200'
              : 'bg-cream-100 text-ink-soft border border-cream-300 hover:border-forest-600/30'
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-urgency-red' : ''}`} />
          <span className="tabular-nums">{likeCount}</span>
        </button>
        <div className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
          <MessageCircle className="w-4 h-4" />
          <span className="tabular-nums">{commentCount}</span>
        </div>
      </div>
      {isOwnPost && (
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-1.5 text-sm text-ink-mute hover:text-urgency-red transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      )}
    </div>
  )
}
