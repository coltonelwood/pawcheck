'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { ArrowLeft, Plus, Syringe, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Vaccine {
  id: string
  name: string
  administered_date: string | null
  due_date: string | null
  veterinarian: string | null
  notes: string | null
}

const COMMON_VACCINES_DOG = [
  'DA2PP (Distemper combo)',
  'Rabies',
  'Bordetella',
  'Leptospirosis',
  'Lyme',
  'Canine Influenza',
]

const COMMON_VACCINES_CAT = [
  'FVRCP',
  'Rabies',
  'Feline Leukemia (FeLV)',
  'FIV',
]

export default function PetVaccinesPage() {
  const params = useParams()
  const petId = params.id as string

  const [pet, setPet] = useState<{ name: string; species: string } | null>(null)
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    administered_date: '',
    due_date: '',
    veterinarian: '',
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [petId])

  async function loadData() {
    const supabase = createClient()
    const [petRes, vRes] = await Promise.all([
      supabase.from('pets').select('name, species').eq('id', petId).single(),
      supabase
        .from('vaccines')
        .select('*')
        .eq('pet_id', petId)
        .order('due_date', { ascending: true, nullsFirst: false }),
    ])
    if (petRes.data) setPet(petRes.data)
    if (vRes.data) setVaccines(vRes.data)
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) return

    const res = await fetch('/api/vaccines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: petId,
        ...form,
        administered_date: form.administered_date || undefined,
        due_date: form.due_date || undefined,
        veterinarian: form.veterinarian || undefined,
        notes: form.notes || undefined,
      }),
    })

    if (res.ok) {
      setForm({ name: '', administered_date: '', due_date: '', veterinarian: '', notes: '' })
      setShowForm(false)
      loadData()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this vaccine record?')) return
    await fetch(`/api/vaccines?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  if (loading) {
    return (
      <div className="container py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-forest-600" />
      </div>
    )
  }

  const commonVaccines = pet?.species === 'cat' ? COMMON_VACCINES_CAT : COMMON_VACCINES_DOG
  const now = new Date()

  return (
    <div className="container max-w-3xl py-8 lg:py-12">
      <Link
        href={`/pet/${petId}`}
        className="inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {pet?.name}
      </Link>

      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink leading-tight">
            Vaccines
          </h1>
          <p className="mt-2 text-ink-mute">
            Track {pet?.name}'s vaccination history.
          </p>
        </div>
        {!showForm && (
          <Button variant="accent" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Add vaccine
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-card rounded-2xl border border-cream-300/60 p-6 mb-6 space-y-4"
        >
          <h2 className="font-display text-xl font-semibold text-ink">
            Add vaccine record
          </h2>
          <div className="space-y-2">
            <Label htmlFor="name">Vaccine</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Rabies"
              list="common-vaccines"
            />
            <datalist id="common-vaccines">
              {commonVaccines.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="administered_date">Date given</Label>
              <Input
                id="administered_date"
                type="date"
                value={form.administered_date}
                onChange={(e) => setForm({ ...form, administered_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Next due</Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="veterinarian">Veterinarian (optional)</Label>
            <Input
              id="veterinarian"
              value={form.veterinarian}
              onChange={(e) => setForm({ ...form, veterinarian: e.target.value })}
              placeholder="Dr. Smith / Acme Animal Hospital"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="default" className="flex-1">
              Save
            </Button>
          </div>
        </form>
      )}

      {vaccines.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-cream-300 p-12 text-center">
          <Syringe className="w-12 h-12 mx-auto text-ink-mute mb-3" strokeWidth={1.5} />
          <p className="text-ink-mute">No vaccines on record yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vaccines.map((v) => {
            const dueDate = v.due_date ? new Date(v.due_date) : null
            const daysUntilDue = dueDate
              ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              : null
            const isOverdue = daysUntilDue !== null && daysUntilDue < 0
            const isDueSoon = daysUntilDue !== null && daysUntilDue <= 30 && daysUntilDue >= 0

            return (
              <div
                key={v.id}
                className={`bg-card rounded-xl border p-5 ${
                  isOverdue
                    ? 'border-urgency-red/30'
                    : isDueSoon
                    ? 'border-amber-200'
                    : 'border-cream-300/60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-ink">{v.name}</h3>
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-urgency-red text-xs font-medium border border-red-200">
                          <AlertCircle className="w-3 h-3" />
                          Overdue
                        </span>
                      )}
                      {isDueSoon && !isOverdue && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                          Due soon
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-ink-mute space-y-0.5">
                      {v.administered_date && (
                        <div>Given: {formatDate(v.administered_date)}</div>
                      )}
                      {v.due_date && <div>Due: {formatDate(v.due_date)}</div>}
                      {v.veterinarian && <div>Vet: {v.veterinarian}</div>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="p-2 text-ink-mute hover:text-urgency-red transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
