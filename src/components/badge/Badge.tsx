import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'

// Literal class strings per tone, so Tailwind's scanner sees every one.
const SUBTLE: Record<BadgeTone, string> = {
  neutral: 'bg-status-neutral-subtle text-status-neutral-fg',
  success: 'bg-status-success-subtle text-status-success-fg',
  warning: 'bg-status-warning-subtle text-status-warning-fg',
  danger: 'bg-status-danger-subtle text-status-danger-fg',
  info: 'bg-status-info-subtle text-status-info-fg',
  accent: 'bg-accent-subtle text-accent-subtle-fg',
}
const OUTLINE: Record<BadgeTone, string> = {
  neutral: 'border-status-neutral text-status-neutral-fg',
  success: 'border-status-success text-status-success-fg',
  warning: 'border-status-warning text-status-warning-fg',
  danger: 'border-status-danger text-status-danger-fg',
  info: 'border-status-info text-status-info-fg',
  accent: 'border-accent text-accent-text',
}
const TONES = Object.keys(SUBTLE) as BadgeTone[]

export const badgeVariants = cva(
  // The transparent border keeps subtle and outline badges the same height.
  'inline-flex items-center gap-1.5 rounded-pill border border-transparent px-2.5 py-0.5 text-sm font-medium whitespace-nowrap',
  {
    variants: {
      tone: Object.fromEntries(TONES.map((tone) => [tone, ''])) as Record<BadgeTone, string>,
      variant: { subtle: '', outline: 'bg-transparent' },
    },
    compoundVariants: TONES.flatMap((tone) => [
      { tone, variant: 'subtle' as const, className: SUBTLE[tone] },
      { tone, variant: 'outline' as const, className: OUTLINE[tone] },
    ]),
    defaultVariants: { tone: 'neutral', variant: 'subtle' },
  },
)

export const badgeDotVariants = cva('size-1.5 shrink-0 rounded-pill', {
  variants: {
    tone: {
      neutral: 'bg-status-neutral',
      success: 'bg-status-success',
      warning: 'bg-status-warning',
      danger: 'bg-status-danger',
      info: 'bg-status-info',
      accent: 'bg-accent',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export type BadgeProps = ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    /** A leading status dot (decorative; the text carries the meaning). */
    dot?: boolean
  }

/** A small pill label. Its text must carry the meaning; the tone only reinforces it. */
export function Badge({ tone, variant, dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      data-tone={tone ?? 'neutral'}
      className={cn(badgeVariants({ tone, variant }), className)}
      {...props}
    >
      {dot ? <span aria-hidden="true" className={badgeDotVariants({ tone })} /> : null}
      {children}
    </span>
  )
}
