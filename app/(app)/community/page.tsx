import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MessageCircle, Plus, Users, Heart } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

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

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const supabase = await createClient()
  const { category } = await searchParams
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('community_posts')
    .select(`
      id, title, content, photo_url, category, like_count, comment_count, created_at,
      user:profiles!user_id(full_name),
      pet:pets(name, species)
    `)
    .eq('is_published', true)
    .eq('is_flagged', false)
    .order('created_at', { ascending: false })
    .limit(50)

  if (category) {
    query = query.eq('category', category)
  }

  const { data: posts } = await query

  return (
    <div className="container max-w-4xl py-8 lg:py-12">
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink leading-tight">
            Community
          </h1>
          <p className="mt-2 text-ink-mute">
            Connect with other pet parents. Share, ask, learn.
          </p>
        </div>
        <Button asChild variant="accent">
          <Link href="/community/new">
            <Plus className="w-4 h-4" />
            New post
          </Link>
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/community"
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            !category
              ? 'bg-forest-600 text-cream-100 border-forest-600'
              : 'bg-transparent text-ink-soft border-cream-300 hover:border-forest-600/40'
          }`}
        >
          All
        </Link>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <Link
            key={key}
            href={`/community?category=${key}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              category === key
                ? 'bg-forest-600 text-cream-100 border-forest-600'
                : 'bg-transparent text-ink-soft border-cream-300 hover:border-forest-600/40'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {!posts || posts.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-cream-300 p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-ink-mute mb-3" strokeWidth={1.5} />
          <p className="text-ink-mute mb-4">No posts yet. Be the first to share.</p>
          <Button asChild variant="default">
            <Link href="/community/new">Create the first post</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post: any) => (
            <Link
              key={post.id}
              href={`/community/post/${post.id}`}
              className="block bg-card rounded-2xl border border-cream-300/60 p-5 hover:border-forest-600/30 transition-all"
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[post.category]}`}
                >
                  {CATEGORY_LABELS[post.category]}
                </span>
                <span className="text-xs text-ink-mute">
                  {post.user?.full_name || 'Anonymous'}
                  {post.pet?.name && ` · ${post.pet.name}`}
                  {' · '}
                  {formatRelativeTime(post.created_at)}
                </span>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-xl font-semibold text-ink mb-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-ink-soft line-clamp-2 mb-3">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-ink-mute">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" />
                      <span className="tabular-nums">{post.like_count}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="tabular-nums">{post.comment_count}</span>
                    </span>
                  </div>
                </div>
                {post.photo_url && (
                  <div className="w-20 h-20 rounded-lg bg-cream-200 overflow-hidden flex-shrink-0">
                    <img
                      src={post.photo_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
