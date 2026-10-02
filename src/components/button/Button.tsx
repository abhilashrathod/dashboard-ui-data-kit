import { Slot, Slottable } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, MouseEvent, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from '../spinner'

export const buttonVariants = cva(
  [
    'relative isolate inline-flex shrink-0 items-center justify-center rounded-pill font-medium whitespace-nowrap select-none',
    'transition-colors duration-(--duration-fast) ease-standard focus-ring',
    '[&_svg]:shrink-0',
    // State layer for neutral fills: a --color-fg overlay, made visible on hover by the variant.
    'before:absolute before:inset-0 before:-z-10 before:rounded-pill before:bg-fg before:opacity-0',
    'before:transition-opacity before:duration-(--duration-fast) before:ease-standard',
    'data-disabled:cursor-not-allowed data-disabled:opacity-50',
    'data-loading:cursor-progress',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-ink text-ink-fg hover-enabled:bg-ink-hover',
        accent: 'bg-accent-solid text-accent-solid-fg hover-enabled:bg-accent-solid-hover',
        secondary: 'bg-surface-muted text-fg hover-enabled:before:opacity-6',
        outline:
          'border border-border-strong bg-transparent text-fg hover-enabled:before:opacity-6',
        ghost: 'bg-transparent text-fg hover-enabled:before:opacity-6',
        danger: 'bg-status-danger text-fg-inverse hover-enabled:before:opacity-12',
      },
      size: {
        sm: 'h-control-sm gap-1.5 px-3 text-sm [&_svg]:size-4',
        md: 'h-control-md gap-2 px-4 text-base [&_svg]:size-4',
        lg: 'h-control-lg gap-2 px-5 text-md [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type ButtonOwnProps = VariantProps<typeof buttonVariants> & {
  /** Decorative icon before the label. Replaced by the spinner while loading. */
  leftIcon?: ReactNode
  /** Decorative icon after the label. */
  rightIcon?: ReactNode
}

export type ButtonProps = ComponentProps<'button'> &
  ButtonOwnProps &
  (
    | {
        asChild?: false
        /**
         * Busy state: spinner, aria-busy, clicks swallowed. The button keeps
         * focus and its width (it is aria-disabled, not disabled).
         */
        loading?: boolean
      }
    | {
        /** Render the single child (e.g. an <a>) with button styles. */
        asChild: true
        /** Links don't load; not supported with asChild. */
        loading?: never
      }
  )

const iconSlot = (icon: ReactNode, hidden = false) =>
  icon ? (
    <span aria-hidden="true" className={cn('inline-flex', hidden && 'opacity-0')}>
      {icon}
    </span>
  ) : null

export function Button({
  variant,
  size,
  leftIcon,
  rightIcon,
  loading = false,
  asChild = false,
  disabled,
  className,
  children,
  onClick,
  type = 'button',
  ref,
  ...props
}: ButtonProps) {
  const blocked = loading || (asChild && disabled)
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // preventDefault also stops a type="submit" button (and Enter in a field) from submitting.
    if (blocked) return event.preventDefault()
    onClick?.(event)
  }
  const classes = cn(buttonVariants({ variant, size }), className)

  if (asChild) {
    return (
      <Slot
        ref={ref}
        className={classes}
        aria-disabled={disabled || undefined}
        data-disabled={disabled ? '' : undefined}
        onClick={handleClick}
        {...props}
      >
        {iconSlot(leftIcon)}
        <Slottable>{children}</Slottable>
        {iconSlot(rightIcon)}
      </Slot>
    )
  }

  // Without a left icon, the spinner is overlaid and the content turns transparent
  // (not removed, not visibility:hidden), so the width and the accessible name stay.
  const overlay = loading && !leftIcon

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      data-loading={loading ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      className={classes}
      onClick={handleClick}
      {...props}
    >
      {overlay ? (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner size="sm" />
        </span>
      ) : null}
      {loading && leftIcon ? <Spinner size="sm" /> : iconSlot(leftIcon)}
      <span data-slot="label" className={cn(overlay && 'opacity-0')}>
        {children}
      </span>
      {iconSlot(rightIcon, overlay)}
    </button>
  )
}
