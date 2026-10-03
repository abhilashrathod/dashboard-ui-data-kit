import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { MouseEvent } from 'react'
import { Badge, IconButton, Tooltip, VisuallyHidden } from '@/components'
import { cn } from '@/lib/cn'
import { useView, type View } from '../navigation'

interface NavItem {
  label: string
  icon: LucideIcon
  /** Absent: not built yet ("Soon"). */
  view?: View
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Overview', icon: LayoutDashboard, view: 'overview' },
  { label: 'Orders', icon: ShoppingBag, view: 'orders' },
  { label: 'Customers', icon: Users },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'Settings', icon: Settings },
]

export function Wordmark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* The logo mark: two stacked "ledger lines" on the brand orange. */}
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 flex-col items-center justify-center gap-1 rounded-pill bg-gradient-accent"
      >
        <span className="h-0.5 w-4 rounded-pill bg-accent-gradient-fg" />
        <span className="h-0.5 w-2.5 self-center rounded-pill bg-accent-gradient-fg" />
      </span>
      {collapsed ? (
        <VisuallyHidden>Ledgerline</VisuallyHidden>
      ) : (
        <span className="text-md font-semibold tracking-tight">Ledgerline</span>
      )}
    </div>
  )
}

const itemClass = (active: boolean, collapsed: boolean) =>
  cn(
    'flex h-control-lg w-full items-center gap-3 rounded-pill text-base font-medium focus-ring',
    'transition-colors duration-(--duration-fast) ease-standard',
    collapsed ? 'justify-center px-0' : 'px-4',
    active ? 'bg-ink text-ink-fg' : 'text-fg-muted hover-enabled:bg-surface-muted hover-enabled:text-fg',
  )

function NavEntry({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  const [view, setView] = useView()
  const Icon = item.icon
  const target = item.view

  let entry
  if (target) {
    const active = view === target
    const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
      // Let modified clicks open a new tab; a plain click navigates in place.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
      event.preventDefault()
      setView(target)
      onNavigate?.()
    }
    entry = (
      <a
        href={target === 'overview' ? '?' : `?view=${target}`}
        aria-current={active ? 'page' : undefined}
        onClick={onClick}
        className={itemClass(active, collapsed)}
      >
        <Icon aria-hidden="true" className="size-5 shrink-0" />
        {collapsed ? <VisuallyHidden>{item.label}</VisuallyHidden> : item.label}
      </a>
    )
  } else {
    // Focusable but inert (aria-disabled, not disabled), so the tooltip and the
    // "coming soon" note still reach keyboard and screen-reader users.
    entry = (
      <button
        type="button"
        aria-disabled="true"
        className={cn(itemClass(false, collapsed), 'cursor-not-allowed hover-enabled:bg-transparent hover-enabled:text-fg-muted')}
      >
        <Icon aria-hidden="true" className="size-5 shrink-0" />
        {collapsed ? (
          <VisuallyHidden>{item.label} (coming soon)</VisuallyHidden>
        ) : (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            <Badge tone="neutral">
              Soon<VisuallyHidden> (coming soon)</VisuallyHidden>
            </Badge>
          </>
        )}
      </button>
    )
  }

  return (
    <li>
      {collapsed ? (
        <Tooltip content={target ? item.label : `${item.label} (soon)`} side="right">
          {entry}
        </Tooltip>
      ) : (
        entry
      )}
    </li>
  )
}

/** The wordmark and the main navigation. Shared by the desktop sidebar and the mobile drawer. */
export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavEntry key={item.label} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </ul>
    </nav>
  )
}

/** md and up. Below md the same nav opens from the top bar in a Drawer. */
export function Sidebar({
  collapsed,
  onCollapsedChange,
}: {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}) {
  const toggleLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar'
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col gap-8 py-6 md:flex lg:top-4 lg:h-[calc(100dvh-2rem)]',
        collapsed ? 'w-20 items-center px-3' : 'w-60 px-4',
      )}
    >
      <div className={cn('flex items-center', collapsed ? 'justify-center' : 'px-2')}>
        <Wordmark collapsed={collapsed} />
      </div>
      <div className="min-h-0 flex-1 self-stretch overflow-y-auto">
        <SidebarNav collapsed={collapsed} />
      </div>
      <div className={cn(collapsed ? 'self-center' : 'self-start px-1')}>
        <Tooltip content={toggleLabel} side="right">
          <IconButton
            variant="ghost"
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            onClick={() => onCollapsedChange(!collapsed)}
          >
            {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
          </IconButton>
        </Tooltip>
      </div>
    </aside>
  )
}
