import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, MouseEvent, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { buttonVariants } from '../button'
import { Spinner } from '../spinner'

/** Square sizes; colors come from buttonVariants. */
export const iconButtonVariants = cva('px-0', {
  variants: {
    size: {
      sm: 'size-control-sm [&_svg]:size-4',
      md: 'size-control-md [&_svg]:size-4',
      lg: 'size-control-lg [&_svg]:size-5',
    },
  },
  defaultVariants: { size: 'md' },
})

/** An icon has no text, so the accessible name must come from aria-label or aria-labelledby. */
type AccessibleName =
  | { 'aria-label': string; 'aria-labelledby'?: string }
  | { 'aria-label'?: undefined; 'aria-labelledby': string }

export type IconButtonProps = Omit<
  ComponentProps<'button'>,
  'aria-label' | 'aria-labelledby' | 'children'
> &
  AccessibleName &
  VariantProps<typeof iconButtonVariants> & {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
    /** The icon. Marked aria-hidden; the name comes from aria-label. */
    children: ReactNode
    /** Spinner in place of the icon, aria-busy, clicks swallowed, focus kept. */
    loading?: boolean
  }

/** A circular button holding a single icon. */
export function IconButton({
  variant = 'secondary',
  size,
  loading = false,
  disabled,
  className,
  children,
  onClick,
  type = 'button',
  ref,
  ...props
}: IconButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) return event.preventDefault()
    onClick?.(event)
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      data-loading={loading ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      className={cn(buttonVariants({ variant }), iconButtonVariants({ size }), className)}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <Spinner />
      ) : (
        <span aria-hidden="true" className="inline-flex">
          {children}
        </span>
      )}
    </button>
  )
}
