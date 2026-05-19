import { cn } from '@/lib/utils'
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface UrgencyBadgeProps {
  urgency: 'green' | 'yellow' | 'red' | null
  label?: string | null
  size?: 'sm' | 'md' | 'lg'
}

export default function UrgencyBadge({ urgency, label, size = 'sm' }: UrgencyBadgeProps) {
  if (!urgency) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cream-200 text-ink-mute text-xs font-medium">
        Processing
      </span>
    )
  }

  const config = {
    green: {
      bg: 'bg-forest-50',
      text: 'text-forest-700',
      border: 'border-forest-200',
      icon: CheckCircle2,
      defaultLabel: 'Monitor at home',
    },
    yellow: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: AlertTriangle,
      defaultLabel: 'Vet within 24h',
    },
    red: {
      bg: 'bg-red-50',
      text: 'text-urgency-red',
      border: 'border-red-200',
      icon: AlertCircle,
      defaultLabel: 'Vet immediately',
    },
  }[urgency]

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3.5 py-1.5 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  }[size]

  const iconSize = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size]

  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        config.bg,
        config.text,
        config.border,
        sizeClasses
      )}
    >
      <Icon className={iconSize} />
      {label || config.defaultLabel}
    </span>
  )
}
