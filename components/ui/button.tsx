'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-forest-600 text-cream-100 hover:bg-forest-700 shadow-[0_1px_2px_rgba(45,90,78,0.15),0_8px_16px_-8px_rgba(45,90,78,0.25)] hover:shadow-[0_2px_4px_rgba(45,90,78,0.2),0_12px_24px_-8px_rgba(45,90,78,0.3)] active:scale-[0.98]',
        accent:
          'bg-amber-400 text-ink hover:bg-amber-500 shadow-[0_1px_2px_rgba(232,165,71,0.2),0_8px_16px_-8px_rgba(232,165,71,0.35)] hover:shadow-[0_2px_4px_rgba(232,165,71,0.25),0_12px_24px_-8px_rgba(232,165,71,0.4)] active:scale-[0.98]',
        outline:
          'border border-forest-600/20 bg-transparent text-ink hover:bg-cream-200 hover:border-forest-600/40',
        ghost: 'text-ink hover:bg-cream-200',
        link: 'text-forest-600 underline-offset-4 hover:underline',
        destructive:
          'bg-urgency-red text-cream-100 hover:bg-urgency-red/90',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-9 px-3.5 text-xs',
        lg: 'h-14 px-8 text-base',
        xl: 'h-16 px-10 text-lg',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
