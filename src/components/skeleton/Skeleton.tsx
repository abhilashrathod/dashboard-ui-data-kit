import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export const skeletonVariants = cva(
  [
    'relative block overflow-hidden bg-surface-muted',
    // Shimmer: a soft band sweeping across. Off under reduced motion.
    'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer',
    'after:bg-linear-to-r after:from-transparent after:via-surface/60 after:to-transparent',
    'motion-reduce:after:hidden',
  ],
  {
    variants: {
      shape: {
        rect: 'rounded-sm',
        tile: 'rounded-md',
        pill: 'rounded-pill',
        circle: 'aspect-square rounded-pill',
      },
    },
    defaultVariants: { shape: 'rect' },
  },
)

export type SkeletonProps = Omit<ComponentProps<'span'>, 'children'> &
  VariantProps<typeof skeletonVariants>

/**
 * Loading placeholder. Size it with `className` (e.g. "h-4 w-24").
 * Always aria-hidden: announce loading once on the region instead
 * (aria-busy, or a Spinner with a label).
 */
export function Skeleton({ shape, className, ...props }: SkeletonProps) {
  return (
    <span aria-hidden="true" className={cn(skeletonVariants({ shape }), className)} {...props} />
  )
}

export type SkeletonTextProps = Omit<ComponentProps<'span'>, 'children'> & {
  /** Number of lines; the last one is shorter. */
  lines?: number
}

/** A paragraph-shaped placeholder: `lines` bars at the body line height. */
export function SkeletonText({ lines = 3, className, ...props }: SkeletonTextProps) {
  return (
    <span aria-hidden="true" className={cn('flex flex-col gap-2', className)} {...props}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3', index === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full')}
        />
      ))}
    </span>
  )
}
