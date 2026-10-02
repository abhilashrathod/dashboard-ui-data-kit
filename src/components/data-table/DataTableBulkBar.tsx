import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import type { RowData } from '@tanstack/react-table'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import { useTheme } from '@/tokens/theme'
import { Button } from '../button'
import { useDataTableContext } from './context'
import type { DataTableSelection } from './useSelection'

export interface DataTableBulkBarProps {
  /** The actions for the current selection, e.g. (selection) => <BulkStatusAction selection={selection} />. */
  children: (selection: DataTableSelection<RowData>) => ReactNode
  className?: string
}

/**
 * The bar for acting on selected rows. Shown only while something is
 * selected, pinned to the bottom of the card (sticky, so it stays in view
 * while the card is scrolled), in the inverse surface: a dark bar in light
 * mode, a light one in dark mode. It never takes focus when it appears.
 * Escape inside it clears the selection.
 */
export function DataTableBulkBar({ children, className }: DataTableBulkBarProps) {
  const { table, label } = useDataTableContext('BulkBar')
  const { selection } = table
  const { resolvedTheme } = useTheme()
  const barRef = useRef<HTMLDivElement>(null)

  if (selection.count === 0) return null

  const clear = () => {
    // The bar (and whatever had focus in it) is about to unmount. Put focus
    // on the table's region rather than letting it fall to <body>.
    const focusInBar = barRef.current?.contains(document.activeElement) ?? false
    const region = barRef.current
      ?.closest('[data-slot="data-table"]')
      ?.querySelector<HTMLElement>('section[tabindex="-1"]')
    selection.clear()
    if (focusInBar) region?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Menus and dialogs opened from the bar portal elsewhere in the DOM but
    // still bubble here through React; they handle (and prevent) their own Escape.
    if (event.key !== 'Escape' || event.defaultPrevented) return
    if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return
    event.preventDefault()
    clear()
  }

  return (
    // The opposite theme on the bar itself: its tokens (surface, fg, buttons)
    // all flip, so the controls inside look native without inverse variants.
    // The keydown handler only catches Escape bubbling up from the bar's own
    // controls (a delegated shortcut); the region itself isn't interactive.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={barRef}
      role="region"
      aria-label={`${label} selection`}
      data-theme={resolvedTheme === 'dark' ? 'light' : 'dark'}
      data-slot="data-table-bulk-bar"
      onKeyDown={handleKeyDown}
      className={cn(
        'sticky bottom-4 z-20 mx-card flex flex-wrap items-center gap-x-3 gap-y-2 rounded-pill bg-surface py-2 pr-2 pl-5 text-fg shadow-overlay',
        className,
      )}
    >
      <p className="text-sm font-medium tabular">{formatNumber(selection.count)} selected</p>
      <div className="flex flex-wrap items-center gap-2">{children(selection)}</div>
      <Button variant="ghost" size="sm" className="ml-auto" onClick={clear}>
        Clear
      </Button>
    </div>
  )
}
