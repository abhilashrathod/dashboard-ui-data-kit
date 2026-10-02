import { Popover as PopoverPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { overlayPanelVariants } from '../overlay'

/** Non-modal floating panel anchored to a trigger. */
export function Popover(props: ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root {...props} />
}

/** Usually `asChild` around a Button. */
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverClose = PopoverPrimitive.Close

/**
 * Portaled panel with space-tile padding. Set the width with `className`
 * (e.g. "w-72"). Defaults: sideOffset 8, collisionPadding 12.
 */
export function PopoverContent({
  className,
  sideOffset = 8,
  collisionPadding = 12,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(overlayPanelVariants(), 'p-tile', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

Popover.Trigger = PopoverTrigger
Popover.Content = PopoverContent
Popover.Close = PopoverClose
