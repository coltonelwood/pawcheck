import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import CommunityPostActions from '@/components/CommunityPostActions'
import CommunityCommentForm from '@/components/CommunityCommentForm'

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  health: 'Health',
  training: 'Training',
  nutrition: 'Nutrition',
  success_story: 'Success Story',
  question: 'Question',
}

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-cream-200 text-ink-soft',
  health: 'bg-red-50 text-urgency-red border border-red-200',
  training: 'bg-forest-50 text-forest-700 border border-forest-200',
  nutrition: 'bg-amber-50 text-amber-700 border border-amber-200',
  success_story: 'bg-amber-100 text-amber-800 border border-amber-300',
  question: 'bg-blue-50 text-blue-700 border border-blue-200',
}

interface PageProps {
  params: { id: string }
}

export default async function PostDetailPage({ params }: PageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: post, error } = await supabase
    .from('community_posts')
    .select(`
      *,
      user:profiles!user_id(full_name),
      pet:pets(name, species)
    `)
    .eq('id', params.id)
    .single()

  if (error || !post || !post.is_published || post.is_flagged) notFound()

  const { data: comments } = await supabase
    .from('community_comments')
    .select(`
      id, content, created_at, user_id,
      user:profiles!user_id(full_name)
    `)
    .eq('post_id', params.id)
    .eq('is_flagged', false)
    .order('created_at', { ascending: true })

  // Has the current user liked this post?
  let userLiked = false
  if (user) {
    const { data: like } = await supabase
      .from('community_likes')
      .select('post_id')
      .eq('post_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle()
    userLiked = !!like
  }

  const isOwnPost = user?.id === post.user_id

  return (
    <div className="container max-w-3xl py-8 lg:py-12">
      <Link
        href="/community"
        className="inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to community
      </Link>

      <article className="bg-card rounded-2xl border border-cream-300/60 p-6 md:p-8 mb-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[post.category]}`}
          >
            {CATEGORY_LABELS[post.category]}
          </span>
          <span className="text-xs text-ink-mute">
            {(post.user as any)?.full_name || 'Anonymous'}
            {(post.pet as any)?.name && ` · ${(post.pet as any).name}`}
            {' · '}
            {formatRelativeTime(post.created_at)}
          </span>
        </div>

        <h1 className="font-display text-3xl md:text-4xl font-bold text-ink leading-tight mb-4">
          {post.title}
        </h1>

        {post.photo_url && (
          <img
            src={post.photo_url}
            alt=""
            className="w-full max-h-[500px] object-contain rounded-xl bg-cream-100 mb-6"
          />
        )}

        <div className="text-ink-soft leading-relaxed whitespace-pre-wrap mb-6">
          {post.content}
        </div>

        <CommunityPostActions
          postId={post.id}
          initialLikeCount={post.like_count}
          initialLiked={userLiked}
          commentCount={post.comment_count}
          isOwnPost={isOwnPost}
        />
      </article>

      {/* Comments section */}
      <div className="bg-card rounded-2xl border border-cream-300/60 p-6 md:p-8">
        <h2 className="font-display text-xl font-semibold text-ink mb-5">
          {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
        </h2>

        <CommunityCommentForm postId={post.id} />

        {comments && comments.length > 0 && (
          <div className="mt-6 space-y-4">
            {comments.map((comment: any) => (
              <div key={comment.id} className="pb-4 border-b border-cream-300/60 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-ink">
                    {comment.user?.full_name || 'Anonymous'}
                  </span>
                  <span className="text-xs text-ink-mute">
                    {formatRelativeTime(comment.created_at)}
                  </span>
                </div>
                <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
