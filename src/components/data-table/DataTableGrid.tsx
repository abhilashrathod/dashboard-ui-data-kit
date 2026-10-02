/* eslint-disable jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role --
 * The explicit table roles below are deliberate. Changing `display` on table
 * elements (we use grid) makes some browsers (Safari/VoiceOver, older Chrome)
 * drop their implicit table semantics; restating the roles keeps them.
 */
import { flexRender, type Header, type RowData } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import type { Sort } from '@/contracts'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import { useAnnounce } from '../announcer'
import { DataBoundary } from '../data-state'
import { Skeleton } from '../skeleton'
import type { DataColumnMeta, DataTableFeatures } from './columns'
import { useDataTableContext } from './context'
import {
  gridTemplateColumns,
  minTableWidth,
  nextSortAction,
  pageRange,
  sortAnnouncement,
  sortingFromParams,
  type ColumnLike,
} from './model'
import type { DataTableModel } from './useDataTable'

const SKELETON_ROWS = 8
/** Skeleton bar widths, cycled per row so the placeholder doesn't look like a barcode. */
const SKELETON_WIDTHS = ['72%', '56%', '84%', '64%']

const cellClass = (meta: DataColumnMeta | undefined) =>
  cn(
    'flex min-w-0 items-center px-3 first:pl-card last:pr-card',
    meta?.align === 'end' && 'justify-end text-right',
  )

type AnyHeader = Header<DataTableFeatures, RowData, unknown>

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const

function SortIndicator({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ChevronsUpDown
  return (
    <Icon aria-hidden="true" className={cn('size-3.5 shrink-0', !sorted && 'text-fg-subtle')} />
  )
}

function HeaderCell({
  header,
  table,
  sorted,
  interactive,
}: {
  header: AnyHeader
  table: DataTableModel<RowData>
  sorted: false | 'asc' | 'desc'
  interactive: boolean
}) {
  const meta = header.column.columnDef.meta
  const label = meta?.label ?? header.column.id
  const sortField = meta?.sortField

  let content: ReactNode = label
  if (sortField && interactive) {
    const action = nextSortAction(sortField, table.params)
    content = (
      <button
        type="button"
        aria-label={`${label}, ${action}`}
        data-sorted={sorted || undefined}
        // toggleSorting → onSortingChange → setParams(setSort(field)): the URL decides.
        onClick={() => header.column.toggleSorting()}
        className={cn(
          '-mx-1.5 inline-flex h-6 items-center gap-1 rounded-xs px-1.5 font-medium focus-ring',
          'transition-colors duration-(--duration-fast) ease-standard hover-enabled:text-fg',
          sorted && 'text-fg',
        )}
      >
        {label}
        <SortIndicator sorted={sorted} />
      </button>
    )
  } else if (sortField) {
    // The skeleton's header: same layout, nothing to press yet.
    content = (
      <span className="inline-flex h-6 items-center gap-1">
        {label}
        <SortIndicator sorted={sorted} />
      </span>
    )
  }

  return (
    <th
      role="columnheader"
      scope="col"
      aria-sort={sorted ? ARIA_SORT[sorted] : undefined}
      className={cn(cellClass(meta), 'h-11 text-sm font-medium text-fg-muted')}
    >
      {content}
    </th>
  )
}

function GridTable({
  table,
  label,
  interactive,
  className,
  children,
}: {
  table: DataTableModel<RowData>
  label: string
  interactive: boolean
  className?: string
  children: ReactNode
}) {
  const { instance, columns, params } = table
  // Read from the URL params, the same source useDataTable derives TanStack's state from.
  const [sort] = sortingFromParams(params.sort, columns as readonly ColumnLike[])
  const style = useMemo(
    () =>
      ({
        '--dt-columns': gridTemplateColumns(columns as readonly ColumnLike[]),
        minWidth: `${minTableWidth(columns as readonly ColumnLike[])}px`,
      }) as CSSProperties,
    [columns],
  )

  return (
    // The scroll container: both axes. Callers cap the height with className
    // (e.g. "max-h-[32rem]"); the header sticks to its top.
    <div data-slot="data-table-scroll" className={cn('overflow-auto', className)}>
      {/*
        Native table elements, laid out with CSS grid: display grid on the
        table, thead, tbody and every row, with one shared
        grid-template-columns. The markup keeps real table semantics (header
        association, row/column counts for screen readers), and each row is an
        independent grid line, so Stage 5 can virtualize rows (absolutely
        position a window of <tr>s) without changing the markup.
      */}
      <table role="table" aria-label={label} style={style} className="grid w-full text-sm">
        <thead
          role="rowgroup"
          className="sticky top-0 z-10 grid border-b border-dashed border-border bg-surface"
        >
          {instance.getHeaderGroups().map((group) => (
            <tr key={group.id} role="row" className="grid grid-cols-(--dt-columns)">
              {group.headers.map((header) => (
                <HeaderCell
                  key={header.id}
                  header={header}
                  table={table}
                  sorted={sort?.id === header.column.id ? (sort.desc ? 'desc' : 'asc') : false}
                  interactive={interactive}
                />
              ))}
            </tr>
          ))}
        </thead>
        {children}
      </table>
    </div>
  )
}

const rowClass = 'grid h-row grid-cols-(--dt-columns)'

function SkeletonBody({ table }: { table: DataTableModel<RowData> }) {
  const columns = table.instance.getAllLeafColumns()
  return (
    <tbody role="rowgroup" aria-hidden="true" className="grid divide-y divide-border">
      {Array.from({ length: SKELETON_ROWS }, (_, rowIndex) => (
        <tr key={rowIndex} role="row" className={rowClass}>
          {columns.map((column, columnIndex) => (
            <td key={column.id} role="cell" className={cellClass(column.columnDef.meta)}>
              <Skeleton
                shape="pill"
                className="h-3"
                style={{
                  width: SKELETON_WIDTHS[(rowIndex + columnIndex) % SKELETON_WIDTHS.length],
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

function Body({ table }: { table: DataTableModel<RowData> }) {
  return (
    <tbody role="rowgroup" className="grid divide-y divide-border">
      {table.rows.map((row) => (
        <tr
          key={row.id}
          role="row"
          className={cn(
            rowClass,
            'transition-colors duration-(--duration-fast) ease-standard hover-enabled:bg-surface-subtle',
          )}
        >
          {row.getAllCells().map((cell) => (
            <td key={cell.id} role="cell" className={cellClass(cell.column.columnDef.meta)}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

/**
 * Polite announcements once data SETTLES (ready and not a placeholder), never
 * while the old rows are still on screen, and never for the initial load:
 *  - the sort changed: "Sorted by Amount, descending"
 *  - the visible range changed: "Showing 51–100 of 4,213"
 * Both changing at once (a sort on page 3 resets to page 1) is one message.
 */
function useGridAnnouncements(table: DataTableModel<RowData>) {
  const announce = useAnnounce()
  const { dataState, params, total, columns } = table
  const settled = dataState.status === 'ready' && !dataState.isPlaceholder
  const { from, to } = pageRange({ page: params.page, pageSize: params.pageSize, total })
  const range = `Showing ${formatNumber(from)}–${formatNumber(to)} of ${formatNumber(total)}`
  const last = useRef<{ sort: Sort; range: string } | null>(null)

  useEffect(() => {
    if (!settled) return
    const before = last.current
    last.current = { sort: params.sort, range }
    if (!before) return // the initial load: nothing changed from the user's point of view

    const messages: string[] = []
    if (before.sort !== params.sort) {
      messages.push(sortAnnouncement(params.sort, before.sort, columns as ColumnLike[]))
    }
    if (before.range !== range) messages.push(range)
    if (messages.length > 0) announce(messages.join('. '))
  }, [settled, params.sort, range, columns, announce])
}

export interface DataTableGridProps {
  /** Goes on the scroll container: cap the height here, e.g. "max-h-[32rem]". Default: none. */
  className?: string
}

/**
 * The table itself, inside a DataBoundary: a skeleton that mirrors it while
 * loading, the empty / no-results / error states in its place, and the
 * refetch bar, stale banner and placeholder dimming over the rows.
 */
export function DataTableGrid({ className }: DataTableGridProps) {
  const { table, label } = useDataTableContext('Grid')
  useGridAnnouncements(table)

  return (
    <DataBoundary
      state={table.dataState}
      label={label}
      // Defaults: NoDataEmptyState ("No orders yet") and NoResultsEmptyState
      // wired to dataState.clear, both using the lower-cased label as the noun.
      skeleton={
        <GridTable table={table} label={label} interactive={false} className={className}>
          <SkeletonBody table={table} />
        </GridTable>
      }
      className="**:data-[slot=stale-banner]:mx-card"
    >
      {() => (
        <GridTable table={table} label={label} interactive className={className}>
          <Body table={table} />
        </GridTable>
      )}
    </DataBoundary>
  )
}
