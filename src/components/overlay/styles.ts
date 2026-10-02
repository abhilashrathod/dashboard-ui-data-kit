import { cva } from 'class-variance-authority'

/*
 * Shared overlay styles: every popover, menu, select, dialog, drawer, tooltip
 * and toast builds on these, so they look and move the same.
 *
 * Theme: overlays portal to document.body, so they inherit data-theme and
 * data-density from <html>. The app (theme.ts, density.ts) and Storybook both
 * set them there.
 */

/**
 * Enter/exit motion keyed on Radix's data-state and data-side. Panels slide 4px
 * in from the side they open toward, and scale from 97%. Under reduced motion,
 * opacity only (the duration tokens are 0ms there, so in practice it's instant).
 */
export const overlayMotion = [
  'data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out',
  'data-[state=delayed-open]:animate-overlay-in data-[state=instant-open]:animate-overlay-in',
  'data-[side=top]:[--overlay-from-y:4px] data-[side=bottom]:[--overlay-from-y:-4px]',
  'data-[side=left]:[--overlay-from-x:4px] data-[side=right]:[--overlay-from-x:-4px]',
  'motion-reduce:data-[state=open]:animate-fade-in motion-reduce:data-[state=closed]:animate-fade-out',
].join(' ')

/** The floating panel: surface, large radius, overlay shadow; a hairline border only in dark mode, where shadows don't read. */
export const overlayPanelVariants = cva(
  'bg-surface text-fg shadow-overlay outline-hidden dark:border dark:border-border',
  {
    variants: {
      /** 'none' for panels with their own motion (the drawer slides in). */
      motion: { popover: overlayMotion, none: '' },
      layer: {
        dropdown: 'z-(--z-dropdown)',
        modal: 'z-(--z-modal)',
        none: '',
      },
      radius: { lg: 'rounded-lg', md: 'rounded-md' },
    },
    defaultVariants: { motion: 'popover', layer: 'dropdown', radius: 'lg' },
  },
)

/** The modal backdrop: canvas at ~60%, slightly blurred, fading in and out. */
export const backdropVariants = cva([
  'fixed inset-0 z-(--z-overlay) bg-canvas/60 backdrop-blur-[2px]',
  'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
])

/**
 * A row in a menu or select list. At least control-sm tall (32px comfortable,
 * 28px compact), highlighted with surface-muted, dimmed when disabled.
 */
export const menuItemVariants = cva(
  [
    'relative flex min-h-control-sm cursor-default items-center gap-2 rounded-sm px-2.5 text-base outline-hidden select-none',
    'data-highlighted:bg-surface-muted data-disabled:pointer-events-none data-disabled:opacity-50',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      tone: {
        default: 'text-fg [&_[data-slot=icon]]:text-fg-muted',
        danger:
          'text-status-danger-fg data-highlighted:bg-status-danger-subtle [&_[data-slot=icon]]:text-status-danger-fg',
      },
    },
    defaultVariants: { tone: 'default' },
  },
)

/** The list panel for menus and selects: tighter padding than a popover. */
export const menuContentClass = 'min-w-48 p-1.5'

/** Section label and separator inside menus and selects. */
export const menuLabelClass = 'px-2.5 pt-2 pb-1 text-xs font-medium text-fg-muted'
export const menuSeparatorClass = '-mx-1.5 my-1.5 h-px bg-border'
