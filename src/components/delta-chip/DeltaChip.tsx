import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { badgeVariants } from '../badge'
import { VisuallyHidden } from '../visually-hidden'
import { computeDelta } from './delta'

const ICON = { up: ArrowUp, down: ArrowDown, flat: Minus, new: null } as const

export type DeltaChipProps = Omit<ComponentProps<'span'>, 'children'> & {
  current: number
  previous: number
  /** Which direction is good news: revenue is good 'up', refund rate is good 'down'. */
  goodWhen: 'up' | 'down'
  /** Only percent change for now. */
  format?: 'percent-change'
  /** Completes the screen-reader sentence, e.g. "vs last 30 days". Not shown visibly. */
  periodLabel?: string
}

/**
 * The change between two values: an arrow and a percent, toned by whether the
 * change is good. Screen readers hear one sentence ("Increased 7% vs last 30
 * days"); the visible arrow and number are aria-hidden.
 */
export function DeltaChip({
  current,
  previous,
  goodWhen,
  format = 'percent-change',
  periodLabel,
  className,
  ...props
}: DeltaChipProps) {
  const delta = computeDelta(current, previous, goodWhen, periodLabel)
  const Icon = ICON[delta.direction]

  return (
    <span
      data-format={format}
      data-direction={delta.direction}
      data-tone={delta.tone}
      className={cn(badgeVariants({ tone: delta.tone }), 'gap-1 px-2 tabular', className)}
      {...props}
    >
      <span aria-hidden="true" className="inline-flex items-center gap-1">
        {Icon ? <Icon className="size-3.5" strokeWidth={2.5} /> : null}
        {delta.text}
      </span>
      <VisuallyHidden>{delta.sentence}</VisuallyHidden>
    </span>
  )
}
