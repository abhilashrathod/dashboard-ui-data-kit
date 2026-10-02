import { Check, ChevronRight } from 'lucide-react'
import { DropdownMenu as Menu } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import {
  menuContentClass,
  menuItemVariants,
  menuLabelClass,
  menuSeparatorClass,
  overlayPanelVariants,
} from '../overlay'

/**
 * A menu of actions or options. Keyboard: Enter/Space/ArrowDown open it,
 * arrows move, typing jumps to an item, Escape closes and returns focus.
 *
 * Multi-toggle menus (e.g. column visibility): call `event.preventDefault()` in
 * the item's onSelect to keep the menu open after toggling.
 */
export function DropdownMenu(props: ComponentProps<typeof Menu.Root>) {
  return <Menu.Root {...props} />
}

export const DropdownMenuTrigger = Menu.Trigger
export const DropdownMenuGroup = Menu.Group
export const DropdownMenuRadioGroup = Menu.RadioGroup
export const DropdownMenuSub = Menu.Sub

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  collisionPadding = 12,
  align = 'start',
  ...props
}: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        align={align}
        className={cn(overlayPanelVariants({ radius: 'md' }), menuContentClass, className)}
        {...props}
      />
    </Menu.Portal>
  )
}

/** Shortcut hint on the right, e.g. "⌘E". Visual only (Radix doesn't bind it). */
function Shortcut({ children }: { children: ReactNode }) {
  return <span className="ml-auto pl-4 text-xs tracking-wide text-fg-muted">{children}</span>
}

export type DropdownMenuItemProps = ComponentProps<typeof Menu.Item> & {
  /** Decorative icon on the left. */
  icon?: ReactNode
  /** Visual shortcut hint on the right. */
  shortcut?: string
  /** "danger" for destructive actions. */
  tone?: 'default' | 'danger'
}

export function DropdownMenuItem({
  icon,
  shortcut,
  tone,
  className,
  children,
  ...props
}: DropdownMenuItemProps) {
  return (
    <Menu.Item className={cn(menuItemVariants({ tone }), className)} {...props}>
      {icon ? (
        <span aria-hidden="true" data-slot="icon" className="inline-flex">
          {icon}
        </span>
      ) : null}
      {children}
      {shortcut ? <Shortcut>{shortcut}</Shortcut> : null}
    </Menu.Item>
  )
}

/** The left slot for check/radio indicators, so labels line up with icon items. */
const indicatorSlot = 'inline-flex size-4 shrink-0 items-center justify-center'

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof Menu.CheckboxItem>) {
  return (
    <Menu.CheckboxItem className={cn(menuItemVariants(), className)} {...props}>
      <span className={indicatorSlot}>
        <Menu.ItemIndicator>
          <Check strokeWidth={2.5} />
        </Menu.ItemIndicator>
      </span>
      {children}
    </Menu.CheckboxItem>
  )
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem className={cn(menuItemVariants(), className)} {...props}>
      <span className={indicatorSlot}>
        <Menu.ItemIndicator>
          <span className="block size-2 rounded-pill bg-fg" />
        </Menu.ItemIndicator>
      </span>
      {children}
    </Menu.RadioItem>
  )
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn(menuLabelClass, className)} {...props} />
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn(menuSeparatorClass, className)} {...props} />
}

export function DropdownMenuSubTrigger({
  icon,
  className,
  children,
  ...props
}: ComponentProps<typeof Menu.SubTrigger> & { icon?: ReactNode }) {
  return (
    <Menu.SubTrigger
      className={cn(menuItemVariants(), 'data-[state=open]:bg-surface-muted', className)}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" data-slot="icon" className="inline-flex">
          {icon}
        </span>
      ) : null}
      {children}
      <ChevronRight aria-hidden="true" className="ml-auto text-fg-muted" />
    </Menu.SubTrigger>
  )
}

export function DropdownMenuSubContent({
  className,
  sideOffset = 4,
  collisionPadding = 12,
  ...props
}: ComponentProps<typeof Menu.SubContent>) {
  return (
    <Menu.Portal>
      <Menu.SubContent
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(overlayPanelVariants({ radius: 'md' }), menuContentClass, className)}
        {...props}
      />
    </Menu.Portal>
  )
}

DropdownMenu.Root = DropdownMenu
DropdownMenu.Trigger = DropdownMenuTrigger
DropdownMenu.Content = DropdownMenuContent
DropdownMenu.Item = DropdownMenuItem
DropdownMenu.CheckboxItem = DropdownMenuCheckboxItem
DropdownMenu.RadioGroup = DropdownMenuRadioGroup
DropdownMenu.RadioItem = DropdownMenuRadioItem
DropdownMenu.Label = DropdownMenuLabel
DropdownMenu.Separator = DropdownMenuSeparator
DropdownMenu.Group = DropdownMenuGroup
DropdownMenu.Sub = DropdownMenuSub
DropdownMenu.SubTrigger = DropdownMenuSubTrigger
DropdownMenu.SubContent = DropdownMenuSubContent
