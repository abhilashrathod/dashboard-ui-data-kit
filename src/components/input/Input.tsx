import { cva, type VariantProps } from 'class-variance-authority'
import { useRef, type ComponentProps, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { mergeRefs } from '@/lib/merge-refs'

export const inputVariants = cva(
  [
    'flex w-full min-w-0 cursor-text items-center rounded-pill border border-transparent bg-surface-subtle text-fg',
    'transition-colors duration-(--duration-fast) ease-standard focus-ring-within',
    'not-data-invalid:hover-enabled:border-border-strong',
    'not-data-invalid:has-[input:focus-visible]:border-border-strong',
    'data-invalid:border-status-danger',
    'data-disabled:cursor-not-allowed data-disabled:opacity-50',
  ],
  {
    variants: {
      size: {
        sm: 'h-control-sm gap-1.5 px-3 text-sm',
        md: 'h-control-md gap-2 px-4 text-base',
        lg: 'h-control-lg gap-2 px-5 text-md',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

const adornment = 'inline-flex shrink-0 items-center text-fg-muted [&_svg]:size-4'

export type InputProps = Omit<ComponentProps<'input'>, 'size'> &
  VariantProps<typeof inputVariants> & {
    /** Sets aria-invalid and a danger edge. Pair it with visible error text. */
    invalid?: boolean
    /** Before the text: a search icon, a currency symbol… */
    leftAdornment?: ReactNode
    /** After the text: a "⌘K" hint, a clear button… */
    rightAdornment?: ReactNode
  }

/**
 * A pill text field. Native props and `ref` go to the <input>; `className`
 * goes to the pill around it. Needs a visible label or aria-label.
 */
export function Input({
  size,
  invalid = false,
  leftAdornment,
  rightAdornment,
  disabled,
  className,
  ref,
  ...props
}: InputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Clicking the pill's padding or an icon focuses the field, as with a native input.
  const focusInput = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (disabled || target === inputRef.current || target.closest('button, a')) return
    event.preventDefault()
    inputRef.current?.focus()
  }

  return (
    // Mouse convenience only: keyboard users reach the <input> directly.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      data-invalid={invalid ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      className={cn(inputVariants({ size }), className)}
      onMouseDown={focusInput}
    >
      {leftAdornment ? <span className={adornment}>{leftAdornment}</span> : null}
      <input
        ref={mergeRefs(ref, inputRef)}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-full min-w-0 flex-1 bg-transparent outline-hidden placeholder:text-fg-subtle disabled:cursor-not-allowed',
          // type="search": our own clear button replaces WebKit's.
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
        {...props}
      />
      {rightAdornment ? <span className={adornment}>{rightAdornment}</span> : null}
    </div>
  )
}
