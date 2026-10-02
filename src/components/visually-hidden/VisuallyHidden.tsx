import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

/**
 * Content for screen readers only: removed visually, kept in the
 * accessibility tree (the standard `sr-only` technique, not `display: none`).
 */
export function VisuallyHidden({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('sr-only', className)} {...props} />
}
