import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatRelativeTime(date: string | Date) {
  const now = new Date()
  const then = new Date(date)
  const diffSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffSeconds < 60) return 'just now'
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`
  return formatDate(date)
}

export function calculateAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null
  const birth = new Date(dateOfBirth)
  const now = new Date()
  const years = (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  return Math.round(years * 10) / 10
}
