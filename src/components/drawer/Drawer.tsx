import { cva, type VariantProps } from 'class-variance-authority'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useRef, type ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { mergeRefs } from '@/lib/merge-refs'
import { OverlayCloseButton } from '../dialog/Dialog'
import { backdropVariants, overlayPanelVariants } from '../overlay'

/*
 * A side panel from the right, built on Radix Dialog: same focus trap,
 * Escape, focus return and title requirement as Dialog (a Drawer.Title must be
 * rendered; Radix logs an error in development otherwise).
 *
 * Layout: Drawer.Header and Drawer.Footer stay put; Drawer.Body scrolls.
 */

export function Drawer(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />
}

export const DrawerTrigger = DialogPrimitive.Trigger
export const DrawerClose = DialogPrimitive.Close

export const drawerContentVariants = cva(
  [
    'fixed inset-y-0 right-0 flex h-dvh max-w-[100vw] flex-col rounded-none rounded-l-lg',
    'data-[state=open]:animate-drawer-in data-[state=closed]:animate-drawer-out',
    'motion-reduce:data-[state=open]:animate-fade-in motion-reduce:data-[state=closed]:animate-fade-out',
  ],
  {
    variants: {
      size: { sm: 'w-95', md: 'w-120', lg: 'w-160' },
    },
    defaultVariants: { size: 'md' },
  },
)

export type DrawerContentProps = ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof drawerContentVariants> & {
    hideClose?: boolean
  }

export function DrawerContent({
  size,
  hideClose = false,
  className,
  children,
  onOpenAutoFocus,
  ref,
  ...props
}: DrawerContentProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={backdropVariants()} />
      <DialogPrimitive.Content
        ref={mergeRefs(ref, panelRef)}
        onOpenAutoFocus={(event) => {
          onOpenAutoFocus?.(event)
          if (event.defaultPrevented) return
          // Focus the panel itself (screen readers announce its title), not the
          // first tab stop, which is usually the scrollable body.
          event.preventDefault()
          panelRef.current?.focus()
        }}
        className={cn(
          overlayPanelVariants({ layer: 'modal', motion: 'none' }),
          drawerContentVariants({ size }),
          className,
        )}
        {...props}
      >
        {children}
        {hideClose ? null : <OverlayCloseButton className="absolute top-4 right-4" />}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

/** Stays at the top. pr-14 keeps the title clear of the close button. */
export function DrawerHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col gap-1 border-b border-border px-card py-5 pr-14',
        className,
      )}
      {...props}
    />
  )
}

export function DrawerTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-lg font-semibold', className)} {...props} />
}

export function DrawerDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-fg-muted', className)} {...props} />
}

/** The only part that scrolls. Focusable so keyboard users can scroll it. */
export function DrawerBody({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      // A scrollable region must be keyboard-reachable (axe: scrollable-region-focusable).
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className={cn('min-h-0 flex-1 overflow-y-auto px-card py-5 focus-ring', className)}
      {...props}
    />
  )
}

/** Stays at the bottom. Actions right-aligned, primary last. */
export function DrawerFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-card py-4',
        className,
      )}
      {...props}
    />
  )
}

Drawer.Trigger = DrawerTrigger
Drawer.Content = DrawerContent
Drawer.Header = DrawerHeader
Drawer.Title = DrawerTitle
Drawer.Description = DrawerDescription
Drawer.Body = DrawerBody
Drawer.Footer = DrawerFooter
Drawer.Close = DrawerClose
