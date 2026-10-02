import { cva } from 'class-variance-authority'
import { Check, Minus } from 'lucide-react'
import { useLayoutEffect, useRef, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { mergeRefs } from '@/lib/merge-refs'

/** The visual box: the native input itself, with appearance reset. */
export const checkboxVariants = cva([
  'peer size-4.5 shrink-0 cursor-pointer appearance-none rounded-xs border border-fg-muted bg-surface',
  'transition-colors duration-(--duration-fast) ease-standard focus-ring',
  'hover-enabled:border-fg',
  'checked:border-ink checked:bg-ink indeterminate:border-ink indeterminate:bg-ink',
  'disabled:cursor-not-allowed',
])

/** Either a visible label, or an aria-label / aria-labelledby. */
type CheckboxName =
  | { label: ReactNode; 'aria-label'?: string; 'aria-labelledby'?: string }
  | { label?: undefined; 'aria-label': string; 'aria-labelledby'?: string }
  | { label?: undefined; 'aria-label'?: undefined; 'aria-labelledby': string }

export type CheckboxProps = Omit<
  ComponentProps<'input'>,
  'type' | 'size' | 'aria-label' | 'aria-labelledby'
> &
  CheckboxName & {
    /**
     * The "some selected" state. Set as the DOM property, so assistive tech
     * hears "mixed". Clicking clears it natively; update your state in onChange.
     */
    indeterminate?: boolean
  }

/**
 * A native checkbox, restyled. Keeps native semantics, Space to toggle, and
 * form behavior. The hit area is 24×24px around an 18px box. Native props and
 * `ref` go to the <input>; `className` goes to the <label> root.
 */
export function Checkbox({
  label,
  indeterminate = false,
  className,
  ref,
  ...props
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <label
      className={cn(
        'inline-flex items-center gap-2 text-base text-fg',
        'has-disabled:cursor-not-allowed has-disabled:opacity-50',
        className,
      )}
    >
      <span className="relative grid size-6 shrink-0 place-items-center">
        <input
          ref={mergeRefs(ref, inputRef)}
          type="checkbox"
          className={checkboxVariants()}
          {...props}
        />
        <Check
          aria-hidden="true"
          data-slot="check"
          strokeWidth={3}
          className="pointer-events-none absolute size-3.5 text-ink-fg opacity-0 peer-[:checked:not(:indeterminate)]:opacity-100"
        />
        <Minus
          aria-hidden="true"
          data-slot="dash"
          strokeWidth={3}
          className="pointer-events-none absolute size-3.5 text-ink-fg opacity-0 peer-indeterminate:opacity-100"
        />
      </span>
      {label}
    </label>
  )
}
