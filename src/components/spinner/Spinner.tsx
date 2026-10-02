import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { VisuallyHidden } from '../visually-hidden'

export const spinnerVariants = cva(
  // Reduced motion: still turns (so it reads as "busy"), but slowly.
  'shrink-0 animate-spin motion-reduce:animate-[spin_2.5s_linear_infinite]',
  {
    variants: {
      size: { sm: 'size-4', md: 'size-5', lg: 'size-6' },
    },
    defaultVariants: { size: 'md' },
  },
)

export type SpinnerProps = Omit<ComponentProps<'span'>, 'children'> &
  VariantProps<typeof spinnerVariants> & {
    /**
     * Announced to screen readers (role="status"). Omit when the spinner is
     * decorative, e.g. inside a Button that already sets aria-busy.
     */
    label?: string
  }

/** An SVG ring in currentColor. */
export function Spinner({ size, label, className, ...props }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : true}
      data-slot="spinner"
      className={cn('inline-flex shrink-0', className)}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={spinnerVariants({ size })}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label ? <VisuallyHidden>{label}</VisuallyHidden> : null}
    </span>
  )
}
