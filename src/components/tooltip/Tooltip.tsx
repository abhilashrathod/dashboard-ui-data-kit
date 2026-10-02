import { Tooltip as TooltipPrimitive } from 'radix-ui'
import { useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { mergeRefs } from '@/lib/merge-refs'
import { overlayMotion } from '../overlay'

/** Shared delay for every tooltip. KitProvider renders it. */
export function TooltipProvider({
  delayDuration = 300,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />
}

type Side = 'top' | 'right' | 'bottom' | 'left'

function TooltipContent({ side, children }: { side: Side; children: ReactNode }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        side={side}
        sideOffset={6}
        collisionPadding={8}
        className={cn(
          'z-(--z-dropdown) max-w-72 rounded-sm bg-surface-inverse px-2 py-1 text-xs text-fg-inverse',
          overlayMotion,
        )}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export type TooltipProps = Omit<ComponentProps<typeof TooltipPrimitive.Root>, 'children'> & {
  /** The tooltip text. */
  content: ReactNode
  side?: Side
  /** The trigger: one focusable element (it's rendered with asChild). */
  children: ReactNode
}

/**
 * A short visual label on hover and keyboard focus. Never the only accessible
 * name: an IconButton keeps its aria-label; the tooltip just shows it.
 */
export function Tooltip({ content, side = 'top', children, ...props }: TooltipProps) {
  return (
    <TooltipPrimitive.Root {...props}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </TooltipPrimitive.Root>
  )
}

export type TruncatedTextProps = Omit<ComponentProps<'span'>, 'children'> & {
  /** The full text. */
  children: string
  side?: Side
}

/**
 * Text cut with an ellipsis. A tooltip with the full text appears ONLY when the
 * text actually overflows, measured when the tooltip would open (hover or
 * focus). Screen readers always get the full text, since truncation is visual.
 *
 * Not focusable by itself; pass tabIndex={0} if keyboard users must reach it
 * (e.g. a table cell that isn't otherwise focusable).
 */
export function TruncatedText({
  children,
  side = 'top',
  className,
  ref,
  ...props
}: TruncatedTextProps) {
  const textRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)

  const handleOpenChange = (next: boolean) => {
    const element = textRef.current
    setOpen(next && element !== null && element.scrollWidth > element.clientWidth)
  }

  return (
    <TooltipPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <TooltipPrimitive.Trigger asChild>
        <span
          ref={mergeRefs(ref, textRef)}
          data-truncated={open ? '' : undefined}
          className={cn('block min-w-0 truncate', className)}
          {...props}
        >
          {children}
        </span>
      </TooltipPrimitive.Trigger>
      <TooltipContent side={side}>{children}</TooltipContent>
    </TooltipPrimitive.Root>
  )
}
