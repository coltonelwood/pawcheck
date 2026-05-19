'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-lg border border-forest-600/15 bg-cream-50 px-3.5 py-2 text-sm transition-colors appearance-none',
        'focus:outline-none focus:border-forest-600/50 focus:ring-2 focus:ring-forest-600/10',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'bg-[url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%237C736D\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
})
Select.displayName = 'Select'

export { Select }
