import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const cardVariants = cva('flex min-w-0 flex-col text-fg', {
  variants: {
    variant: {
      default: 'gap-4 rounded-lg bg-surface p-card',
      tile: 'gap-3 rounded-md bg-surface-subtle p-tile',
      hero: 'gap-6 rounded-lg bg-gradient-accent p-card text-accent-gradient-fg',
    },
  },
  defaultVariants: { variant: 'default' },
})

/*
 * Small text on the hero gradient fails 4.5:1 (white is 3.77:1 on the dark
 * stop), so inside a hero, titles and descriptions render as a surface pill.
 */
const ON_HERO_AS_PILL =
  'in-data-[variant=hero]:self-start in-data-[variant=hero]:rounded-pill in-data-[variant=hero]:bg-surface in-data-[variant=hero]:px-3 in-data-[variant=hero]:py-1 in-data-[variant=hero]:text-sm in-data-[variant=hero]:font-medium in-data-[variant=hero]:text-fg'

export type CardProps = ComponentProps<'div'> & VariantProps<typeof cardVariants>

/** A surface (default), a nested tile, or the hero gradient (one per screen). */
export function Card({ variant, className, ...props }: CardProps) {
  return (
    <div
      data-variant={variant ?? 'default'}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
}

export type CardHeaderProps = ComponentProps<'div'> & {
  /** Buttons or menus aligned to the right of the title. */
  actions?: ReactNode
}

export function CardHeader({ actions, className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)} {...props}>
      <div className="flex min-w-0 flex-col gap-1">{children}</div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export type CardTitleProps = ComponentProps<'h3'> & {
  /** Heading level, to fit the page outline. */
  as?: 'h2' | 'h3' | 'h4'
}

export function CardTitle({ as: Heading = 'h3', className, ...props }: CardTitleProps) {
  return <Heading className={cn('text-md font-semibold', ON_HERO_AS_PILL, className)} {...props} />
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-fg-muted', ON_HERO_AS_PILL, className)} {...props} />
}

export function CardBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('min-w-0', className)} {...props} />
}

Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Body = CardBody
