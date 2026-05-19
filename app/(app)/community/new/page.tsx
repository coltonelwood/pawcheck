'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ArrowLeft, Camera, X, Loader2 } from 'lucide-react'

interface Pet {
  id: string
  name: string
}

export default function NewCommunityPostPage() {
  const router = useRouter()
  const [pets, setPets] = useState<Pet[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'general' as 'general' | 'health' | 'training' | 'nutrition' | 'success_story' | 'question',
    pet_id: '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('pets')
        .select('id, name')
        .order('created_at', { ascending: false })
      if (data) setPets(data)
    }
    load()
  }, [])

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB')
      return
    }
    setPhotoFile(file)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => setPhotoPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  function clearPhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let photoUrl: string | null = null
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('community-photos')
          .upload(fileName, photoFile, { contentType: photoFile.type })
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)
        const { data: { publicUrl } } = supabase.storage
          .from('community-photos')
          .getPublicUrl(fileName)
        photoUrl = publicUrl
      }

      const res = await fetch('/api/community/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          category: form.category,
          photo_url: photoUrl,
          pet_id: form.pet_id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post')

      router.push(`/community/post/${data.post_id}`)
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="container max-w-2xl py-8 lg:py-12">
      <Link
        href="/community"
        className="inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to community
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold text-ink leading-tight">
          New post
        </h1>
        <p className="mt-2 text-ink-mute">
          Share with the community. Be kind, be helpful.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-2xl border border-cream-300/60 p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as any })}
            >
              <option value="general">General</option>
              <option value="health">Health</option>
              <option value="training">Training</option>
              <option value="nutrition">Nutrition</option>
              <option value="success_story">Success story</option>
              <option value="question">Question</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-urgency-red">*</span></Label>
            <Input
              id="title"
              required
              minLength={3}
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Give your post a clear title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content <span className="text-urgency-red">*</span></Label>
            <Textarea
              id="content"
              required
              minLength={10}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Share your story, question, or update..."
              rows={6}
            />
          </div>

          {pets.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="pet">About a specific pet? (optional)</Label>
              <Select
                id="pet"
                value={form.pet_id}
                onChange={(e) => setForm({ ...form, pet_id: e.target.value })}
              >
                <option value="">No specific pet</option>
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Photo (optional)</Label>
            {!photoPreview ? (
              <label className="block">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="sr-only"
                />
                <div className="border-2 border-dashed border-forest-600/20 rounded-xl p-8 text-center hover:border-forest-600/40 hover:bg-cream-100/50 transition-colors cursor-pointer">
                  <Camera className="w-8 h-8 mx-auto text-forest-600/60 mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-ink-mute">Add a photo</p>
                </div>
              </label>
            ) : (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full max-h-72 object-contain rounded-xl bg-cream-100"
                />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-ink/80 text-cream-100 flex items-center justify-center hover:bg-ink transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-urgency-red/10 border border-urgency-red/20 rounded-lg text-sm text-urgency-red">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/community">Cancel</Link>
          </Button>
          <Button type="submit" variant="accent" className="flex-1" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Posting...
              </>
            ) : (
              'Post'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
