import { cva } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { formatCurrency, formatCurrencyToParts } from '@/lib/format'
import { VisuallyHidden } from '../visually-hidden'

export const amountVariants = cva('inline-flex items-baseline whitespace-nowrap tabular', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-md',
      'display-sm': 'text-display-sm',
      display: 'text-display',
    },
  },
  defaultVariants: { size: 'md' },
})

export type AmountSize = 'sm' | 'md' | 'display-sm' | 'display'

export type AmountProps = Omit<ComponentProps<'span'>, 'children'> & {
  value: number
  /** USD only: multi-currency is out of scope (see src/lib/format.ts). */
  currency?: 'USD'
  /** 14000 → "$14K". */
  compact?: boolean
  size?: AmountSize
  /**
   * Render the currency symbol separately, in orange. Defaults to true at
   * display sizes. Turn it off on the hero gradient, where orange won't show.
   */
  glyph?: boolean
}

/**
 * A money value with tabular digits. With a glyph, the visible parts are
 * aria-hidden and screen readers get the formatted value once, from a
 * visually hidden copy. Negatives use a real minus sign and no color.
 */
export function Amount({
  value,
  currency = 'USD',
  compact = false,
  size = 'md',
  glyph,
  className,
  ...props
}: AmountProps) {
  const display = size === 'display' || size === 'display-sm'
  const classes = cn(amountVariants({ size }), className)

  if (!(glyph ?? display)) {
    return (
      <span data-currency={currency} className={classes} {...props}>
        {formatCurrency(value, { compact })}
      </span>
    )
  }

  // Display sizes are large text, where --color-accent passes 3:1; smaller
  // sizes need --color-accent-text (4.5:1).
  const glyphColor = display ? 'text-accent' : 'text-accent-text'
  return (
    <span data-currency={currency} className={classes} {...props}>
      <span aria-hidden="true">
        {formatCurrencyToParts(value, { compact }).map((part, index) =>
          part.type === 'currency' ? (
            <span key={index} data-slot="glyph" className={glyphColor}>
              {part.value}
            </span>
          ) : (
            part.value
          ),
        )}
      </span>
      <VisuallyHidden>{formatCurrency(value, { compact })}</VisuallyHidden>
    </span>
  )
}
