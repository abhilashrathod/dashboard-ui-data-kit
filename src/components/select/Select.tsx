import { type VariantProps } from 'class-variance-authority'
import { Check, ChevronDown } from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { inputVariants } from '../input'
import {
  menuContentClass,
  menuItemVariants,
  menuLabelClass,
  menuSeparatorClass,
  overlayPanelVariants,
} from '../overlay'

export type SelectTriggerProps = ComponentProps<typeof SelectPrimitive.Trigger> &
  VariantProps<typeof inputVariants> & {
    /** Shown until a value is chosen. */
    placeholder?: ReactNode
    /** Sets aria-invalid and the danger edge. Pair it with visible error text. */
    invalid?: boolean
  }

/**
 * The pill that opens the list. It is the Input pill (same tone, sizes, edge,
 * invalid state), as a button with a chevron. The placeholder uses fg-muted:
 * unlike an <input>'s placeholder attribute it's real text, so it must pass 4.5:1.
 */
export function SelectTrigger({
  size,
  invalid = false,
  placeholder,
  className,
  ...props
}: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      aria-invalid={invalid || undefined}
      data-invalid={invalid ? '' : undefined}
      className={cn(
        inputVariants({ size }),
        'cursor-default justify-between text-left focus-ring',
        'not-data-invalid:focus-visible:border-border-strong',
        'data-placeholder:text-fg-muted [&>span]:truncate',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Value placeholder={placeholder} />
      <SelectPrimitive.Icon asChild>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

/**
 * The list: anchored below the trigger (position="popper"), at least as wide
 * as the trigger, capped in height with scrolling.
 */
export function SelectContent({
  className,
  children,
  sideOffset = 6,
  collisionPadding = 12,
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          overlayPanelVariants({ radius: 'md' }),
          'max-h-[min(var(--radix-select-content-available-height),20rem)] min-w-(--radix-select-trigger-width) overflow-hidden',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className={menuContentClass}>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item className={cn(menuItemVariants(), 'pr-8', className)} {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex">
        <Check aria-hidden="true" strokeWidth={2.5} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label className={cn(menuLabelClass, className)} {...props} />
}

export function SelectSeparator({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator className={cn(menuSeparatorClass, className)} {...props} />
}

export interface SelectOption {
  value: string
  label: ReactNode
  disabled?: boolean
}

export type SelectProps = Omit<ComponentProps<typeof SelectPrimitive.Root>, 'children'> &
  Pick<
    SelectTriggerProps,
    | 'size'
    | 'invalid'
    | 'placeholder'
    | 'className'
    | 'id'
    | 'aria-label'
    | 'aria-labelledby'
    | 'aria-describedby'
  > & {
    options: SelectOption[]
  }

/**
 * The simple API: `<Select value onValueChange options placeholder aria-label />`.
 * Root props (value, defaultValue, onValueChange, disabled, name, required…)
 * go to Radix; `className`, `id` and the aria-* props go to the trigger.
 * For custom items, compose Select.Root / Trigger / Content / Item instead.
 */
export function Select({
  options,
  size,
  invalid,
  placeholder,
  className,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  ...rootProps
}: SelectProps) {
  return (
    <SelectPrimitive.Root {...rootProps}>
      <SelectTrigger
        size={size}
        invalid={invalid}
        placeholder={placeholder}
        className={className}
        id={id}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
      />
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectPrimitive.Root>
  )
}

Select.Root = SelectPrimitive.Root
Select.Trigger = SelectTrigger
Select.Content = SelectContent
Select.Item = SelectItem
Select.Group = SelectPrimitive.Group
Select.Label = SelectLabel
Select.Separator = SelectSeparator
