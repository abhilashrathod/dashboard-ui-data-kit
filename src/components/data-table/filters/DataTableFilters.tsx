import { TriangleAlert, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import type { ListParams } from '@/contracts'
import { cn } from '@/lib/cn'
import { clearFilters } from '@/lib/url-state'
import { Button } from '../../button'
import { IconButton } from '../../icon-button'
import { useDataTableContext } from '../context'
import type { ColumnLike } from '../model'
import { filterableColumns } from './filterModel'
import { FilterPill } from './FilterPill'

/** Notices dismissed in this page session, per table and dropped set. Cleared by a reload. */
const dismissedNotices = new Set<string>()

export interface DataTableFiltersProps {
  className?: string
}

/**
 * One filter pill per column with `meta.filter`, in column order, then "Clear
 * all" while any filter is active. Generated entirely from column meta; every
 * change is a URL push through setParams (the page resets on its own). Above
 * them, a dismissible notice when the link carried filters that didn't parse.
 */
export function DataTableFilters({ className }: DataTableFiltersProps) {
  const { table } = useDataTableContext('Filters')
  const { params, setParams, dropped = [], id } = table
  const columns = filterableColumns(table.columns as readonly ColumnLike[])
  const rowRef = useRef<HTMLDivElement>(null)

  const apply = useCallback(
    (updater: (prev: ListParams) => ListParams) => setParams(updater),
    [setParams],
  )

  const noticeKey = `${id}\n${dropped.join('\n')}`
  const [, rerender] = useState(0)
  const showNotice = dropped.length > 0 && !dismissedNotices.has(noticeKey)

  if (columns.length === 0) return null
  const anyActive = params.filters.length > 0

  const clearAll = () => {
    // Filters only: the sort and the search stay.
    setParams(clearFilters())
    // "Clear all" is about to unmount; land on the first pill.
    rowRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }

  return (
    <div className={cn('flex flex-col gap-3 px-card', className)}>
      {showNotice ? (
        <div
          role="status"
          className="flex items-center gap-2 self-start rounded-pill bg-status-warning-subtle py-1 pr-1 pl-3 text-sm text-status-warning-fg"
        >
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
          <span>{noticeText(dropped)}</span>
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Dismiss"
            onClick={() => {
              dismissedNotices.add(noticeKey)
              rerender((n) => n + 1)
            }}
          >
            <X />
          </IconButton>
        </div>
      ) : null}
      <div
        ref={rowRef}
        role="group"
        aria-label="Filters"
        className="flex flex-wrap items-center gap-2"
      >
        {columns.map((column) => (
          <FilterPill key={column.filter.field} column={column} params={params} apply={apply} />
        ))}
        {anyActive ? (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear all
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/** Filters are what usually break; a bad sort or page size is called a "part". */
function noticeText(dropped: readonly string[]): string {
  const n = dropped.length
  const allFilters = dropped.every((issue) => issue.startsWith('f['))
  const noun = allFilters ? (n === 1 ? 'filter' : 'filters') : n === 1 ? 'part' : 'parts'
  return `${n} invalid ${noun} in the link ${n === 1 ? 'was' : 'were'} ignored`
}
