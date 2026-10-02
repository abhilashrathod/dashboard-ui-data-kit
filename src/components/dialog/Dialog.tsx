import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { IconButton } from '../icon-button'
import { backdropVariants, overlayPanelVariants } from '../overlay'

/*
 * Modal dialog. Radix traps focus, closes on Escape, returns focus to the
 * trigger, and hides the rest of the page from assistive tech.
 *
 * Title requirement: every Dialog.Content must contain a Dialog.Title (use
 * <VisuallyHidden asChild> around it if it shouldn't show). We rely on Radix's
 * development check, which logs console.error when the title is missing, and
 * src/test/setup.ts turns that error into a failing unit test. A required
 * `title` prop was the alternative; the runtime check keeps Header / Title /
 * Description composable.
 */

export function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />
}

export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export const dialogContentVariants = cva(
  [
    // Centered with the `translate` property, which composes with the
    // animation's `transform` (scale), so the enter/exit doesn't jump.
    'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col gap-4 p-card',
  ],
  {
    variants: {
      size: { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' },
    },
    defaultVariants: { size: 'md' },
  },
)

/** The close button in the top-right corner, shared with Drawer. */
export function OverlayCloseButton({ className }: { className?: string }) {
  return (
    <DialogPrimitive.Close asChild>
      <IconButton variant="ghost" size="sm" aria-label="Close" className={className}>
        <X />
      </IconButton>
    </DialogPrimitive.Close>
  )
}

export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof dialogContentVariants> & {
    /** Omit the top-right close button (e.g. ConfirmDialog, which has Cancel). */
    hideClose?: boolean
  }

export function DialogContent({
  size,
  hideClose = false,
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={backdropVariants()} />
      <DialogPrimitive.Content
        className={cn(
          overlayPanelVariants({ layer: 'modal' }),
          dialogContentVariants({ size }),
          className,
        )}
        {...props}
      >
        {children}
        {/* Last in DOM order, so initial focus lands on the content, not on Close. */}
        {hideClose ? null : <OverlayCloseButton className="absolute top-4 right-4" />}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  // pr-10 keeps the title clear of the close button.
  return <div className={cn('flex flex-col gap-1 pr-10', className)} {...props} />
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-lg font-semibold', className)} {...props} />
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-fg-muted', className)} {...props} />
}

/** Scrolls when the content is taller than the viewport. */
export function DialogBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('-mx-1 min-h-0 overflow-y-auto px-1', className)} {...props} />
}

/** Actions, right-aligned. Put the primary action LAST. */
export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2', className)} {...props} />
  )
}

Dialog.Trigger = DialogTrigger
Dialog.Content = DialogContent
Dialog.Header = DialogHeader
Dialog.Title = DialogTitle
Dialog.Description = DialogDescription
Dialog.Body = DialogBody
Dialog.Footer = DialogFooter
Dialog.Close = DialogClose
