/* eslint-disable jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role --
 * The explicit roles below are deliberate. Changing `display` on table
 * elements (we use grid) makes some browsers (Safari/VoiceOver, older Chrome)
 * drop their implicit table semantics; restating the roles keeps them. The
 * live table is an ARIA grid (WAI-ARIA APG "Data Grid"): cells are focusable
 * (roving tabindex) and the table owns their keyboard handling.
 */
import { flexRender, type Header, type Row, type RowData } from '@tanstack/react-table'
import {
  defaultRangeExtractor,
  useVirtualizer,
  type Range,
  type Virtualizer,
} from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import type { Sort } from '@/contracts'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import { useAnnounce } from '../announcer'
import { DataBoundary } from '../data-state'
import { Skeleton } from '../skeleton'
import { VisuallyHidden } from '../visually-hidden'
import type { DataColumnMeta, DataTableFeatures } from './columns'
import { DataTableCellContext, DataTableParamsContext, useDataTableContext } from './context'
import {
  CellInteractiveContext,
  FOCUS_TARGET_ATTR,
  FocusTargetContext,
  gridCellProps,
  posOf,
  type CellKind,
} from './keyboard/focusTarget'
import { DEFAULT_PAGE_STEP, HEADER_ROW } from './keyboard/gridNav'
import { useRenderCount } from './keyboard/renderCounter'
import { useGridKeyboard } from './keyboard/useGridKeyboard'
import type { GridScroller } from './keyboard/useGridState'
import {
  columnIdOf,
  gridTemplateColumns,
  minTableWidth,
  nextSortAction,
  pageRange,
  sortAnnouncement,
  sortingFromParams,
  type ColumnLike,
} from './model'
import { SELECTION_ANNOUNCE_DELAY_MS, viewKeyOf } from './selection'
import type { DataTableModel } from './useDataTable'

const SKELETON_ROWS = 8
/** Skeleton bar widths, cycled per row so the placeholder doesn't look like a barcode. */
const SKELETON_WIDTHS = ['72%', '56%', '84%', '64%']

const cellClass = (meta: DataColumnMeta | undefined) =>
  cn(
    'flex min-w-0 items-center px-3 first:pl-card last:pr-card',
    meta?.align === 'end' && 'justify-end text-right',
  )

/** A focusable cell: the ring is drawn inside it, so the scroll container can't clip it. */
const focusableCellClass = 'outline-none focus-ring-inset'

type AnyHeader = Header<DataTableFeatures, RowData, unknown>
type AnyRow = Row<DataTableFeatures, RowData>

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const

/** The column's cell kind (docs/keyboard-grid.md#cell-kinds). */
const cellKindOf = (meta: DataColumnMeta | undefined): CellKind => meta?.cellKind ?? 'text'

function SortIndicator({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ChevronsUpDown
  return (
    <Icon aria-hidden="true" className={cn('size-3.5 shrink-0', !sorted && 'text-fg-subtle')} />
  )
}

/** Wraps a widget cell's content so its one control can read its roving tabIndex. */
function WidgetTarget({ active, children }: { active: boolean; children: ReactNode }) {
  return <FocusTargetContext value={active ? 0 : -1}>{children}</FocusTargetContext>
}

/** Wraps a composite cell's content: its controls are Tab stops only while interacting. */
function CompositeControls({
  interacting,
  children,
}: {
  interacting: boolean
  children: ReactNode
}) {
  return <CellInteractiveContext value={interacting ? 0 : -1}>{children}</CellInteractiveContext>
}

/** Read by screen readers on every composite cell (aria-describedby); rendered once per grid. */
const INTERACT_HINT = 'Press Enter to interact with the cell, Escape to exit'

function HeaderCell({
  header,
  table,
  sorted,
  interactive,
  col,
  active,
}: {
  header: AnyHeader
  table: DataTableModel<RowData>
  sorted: false | 'asc' | 'desc'
  interactive: boolean
  /** Index among the visible columns. */
  col: number
  /** The grid's active cell is this header. */
  active: boolean
}) {
  const meta = header.column.columnDef.meta
  const label = meta?.label ?? header.column.id
  const sortField = meta?.sortField
  const template = header.column.columnDef.header
  const rendered = typeof template === 'function'
  // A sortable header holds one button: a widget cell. So does a rendered
  // header of a widget column (the selection checkbox). Others are text.
  const kind: CellKind =
    (sortField && !rendered) || (rendered && cellKindOf(meta) === 'widget') ? 'widget' : 'text'

  // A utility column (row actions) keeps its name for screen readers only.
  let content: ReactNode = meta?.utility ? <VisuallyHidden>{label}</VisuallyHidden> : label
  if (rendered) {
    // A rendered header (the selection column's checkbox). The skeleton leaves it empty.
    content = interactive ? flexRender(template, header.getContext()) : null
  } else if (sortField && interactive) {
    const action = nextSortAction(sortField, table.params)
    content = (
      <button
        type="button"
        aria-label={`${label}, ${action}`}
        data-sorted={sorted || undefined}
        // The grid owns focusability: only the active cell's target is a Tab stop.
        tabIndex={active ? 0 : -1}
        {...{ [FOCUS_TARGET_ATTR]: '' }}
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
      // Its label is for screen readers only; the Storybook axe config knows (empty-table-header).
      data-utility={meta?.utility ? '' : undefined}
      {...(interactive && gridCellProps({ row: HEADER_ROW, col, kind, active }))}
      className={cn(
        cellClass(meta),
        'h-11 text-sm font-medium text-fg-muted',
        interactive && kind !== 'widget' && focusableCellClass,
      )}
    >
      {interactive && kind === 'widget' && rendered ? (
        <WidgetTarget active={active}>{content}</WidgetTarget>
      ) : (
        content
      )}
    </th>
  )
}

function GridTable({
  table,
  label,
  interactive,
  className,
  gridProps,
  scrollRef,
  headRef,
  children,
}: {
  table: DataTableModel<RowData>
  label: string
  interactive: boolean
  className?: string
  /** The live grid's ref and delegated handlers (useGridKeyboard). */
  gridProps?: ComponentProps<'table'>
  /** The scroll container, for the row virtualizer. */
  scrollRef?: RefObject<HTMLDivElement | null>
  /** The sticky <thead>, measured by the row virtualizer. */
  headRef?: RefObject<HTMLTableSectionElement | null>
  children: ReactNode
}) {
  const { instance, columns, params, columnVisibility, activeCell, selectable, total } = table
  const { hasBulkBar } = useDataTableContext('Grid')
  // Read from the URL params, the same source useDataTable derives TanStack's state from.
  const [sort] = sortingFromParams(params.sort, columns as readonly ColumnLike[])
  // The grid tracks follow the VISIBLE columns: hiding one gives its space to the rest.
  const visibilityState = columnVisibility.state
  const style = useMemo(() => {
    const visible = (columns as readonly ColumnLike[]).filter((column) => {
      const id = columnIdOf(column)
      return id === undefined || visibilityState[id] !== false
    })
    return {
      '--dt-columns': gridTemplateColumns(visible),
      minWidth: `${minTableWidth(visible)}px`,
    } as CSSProperties
  }, [columns, visibilityState])
  // While the bulk bar is up it floats over the bottom of the card: leave room
  // under the last row so it can always be scrolled into view.
  const barSpace = hasBulkBarSpace(hasBulkBar, table)
  const headerActive = interactive && activeCell.row === HEADER_ROW

  return (
    // The scroll container: both axes. Callers cap the height with className
    // (e.g. "max-h-[32rem]"); the header sticks to its top. scroll-padding
    // keeps a row that receives focus (and so scrolls into view) clear of the
    // sticky header and the bulk bar.
    <div
      ref={scrollRef}
      data-slot="data-table-scroll"
      className={cn('scroll-pt-11 overflow-auto', barSpace && 'scroll-pb-20 pb-20', className)}
    >
      {/*
        Native table elements, laid out with CSS grid: display grid on the
        table, thead, tbody and every row, with one shared
        grid-template-columns. The markup keeps real table semantics (header
        association, row/column counts for screen readers), and each row is an
        independent grid line, so Stage 5 can virtualize rows (absolutely
        position a window of <tr>s) without changing the markup.

        The live table is role="grid". The skeleton is hidden from assistive
        tech entirely: the region says it's busy, and a grid of placeholders
        would only be noise.
      */}
      <table
        {...(interactive
          ? {
              role: 'grid',
              'aria-label': label,
              // + 1: the header row. Rows are counted across the whole result,
              // not the page: see Body.
              'aria-rowcount': total + 1,
              'aria-colcount': instance.getVisibleLeafColumns().length,
              'aria-multiselectable': selectable || undefined,
              ...gridProps,
            }
          : { role: 'table', 'aria-hidden': true })}
        style={style}
        className="group/grid grid w-full text-sm"
      >
        <thead
          ref={headRef}
          role="rowgroup"
          className="sticky top-0 z-10 grid border-b border-dashed border-border bg-surface"
        >
          {instance.getHeaderGroups().map((group) => (
            <tr
              key={group.id}
              role="row"
              aria-rowindex={interactive ? 1 : undefined}
              className="grid grid-cols-(--dt-columns)"
            >
              {group.headers.map((header, col) => (
                <HeaderCell
                  key={header.id}
                  header={header}
                  table={table}
                  sorted={sort?.id === header.column.id ? (sort.desc ? 'desc' : 'asc') : false}
                  interactive={interactive}
                  col={col}
                  active={headerActive && activeCell.col === col}
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

/** The bulk bar is up, floating over the bottom of the scroll container. */
const hasBulkBarSpace = (hasBulkBar: boolean, table: DataTableModel<RowData>) =>
  hasBulkBar && table.selection.count > 0

/** The room scroll-pb-20 leaves for the bulk bar, in px. */
const BULK_BAR_SPACE = 80

const rowClass = 'grid h-row grid-cols-(--dt-columns)'

function SkeletonBody({ table }: { table: DataTableModel<RowData> }) {
  const columns = table.instance.getVisibleLeafColumns()
  return (
    <tbody role="rowgroup" className="grid divide-y divide-border">
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

interface GridRowProps {
  row: AnyRow
  /** Index on the page: the grid row the keyboard model uses. */
  rowIndex: number
  /** aria-rowindex of the page's first row. */
  rowOffset: number
  /** undefined when the table isn't selectable (no aria-selected at all). */
  isSelected: boolean | undefined
  /** The active column, or null when the active cell isn't in this row. */
  activeCol: number | null
  /** The active cell is in interaction mode (only ever true on the active row). */
  interacting: boolean
  /** The visible column ids: a visibility change re-renders every row. */
  columnsKey: string
  /** id of the grid's "Press Enter to interact" description, for composite cells. Stable. */
  hintId: string
  /**
   * Virtualized: the row's offset in the tbody, in px (absolutely positioned).
   * Fixed per index for a given row height, so it doesn't break the memo.
   */
  virtualStart?: number
  /** The page's last row: no bottom border (virtualized rows can't use divide-y). */
  last?: boolean
}

/**
 * One data row. Memoized, and every prop is a primitive or a stable TanStack
 * row, so moving the active cell re-renders exactly the row it left and the
 * row it entered (one row when it moves within a row). The rule is enforced
 * by a render-count test (keyboard.test.tsx).
 */
const GridRow = memo(function GridRow({
  row,
  rowIndex,
  rowOffset,
  isSelected,
  activeCol,
  interacting,
  hintId,
  virtualStart,
  last,
}: GridRowProps) {
  useRenderCount(row.id)
  const virtual = virtualStart !== undefined
  return (
    <tr
      role="row"
      aria-rowindex={rowOffset + rowIndex}
      style={virtual ? { transform: `translateY(${virtualStart}px)` } : undefined}
      aria-selected={isSelected}
      data-selected={isSelected ? '' : undefined}
      data-active={activeCol !== null ? '' : undefined}
      className={cn(
        // group/row: cells show row-level affordances on hover / focus (the copy button).
        'group/row',
        rowClass,
        virtual && 'absolute top-0 left-0 w-full',
        virtual && !last && 'border-b border-border',
        'transition-colors duration-(--duration-fast) ease-standard not-data-selected:hover-enabled:bg-surface-subtle',
        // The active row, only while focus is in the grid: a subtle tint, so
        // the eye finds the row of the focused cell.
        'not-data-selected:data-active:group-focus-within/grid:bg-surface-subtle',
        // Selected: the accent tint plus a 3px accent bar on the left edge
        // (an inset shadow, so it takes no layout space).
        'data-selected:bg-accent-subtle data-selected:shadow-[inset_3px_0_0_var(--color-accent)]',
      )}
    >
      {row.getVisibleCells().map((cell, col) => {
        const meta = cell.column.columnDef.meta
        const kind = cellKindOf(meta)
        const active = activeCol === col
        const inMode = active && interacting
        const content = flexRender(cell.column.columnDef.cell, cell.getContext())
        return (
          <td
            key={cell.id}
            role="gridcell"
            {...gridCellProps({ row: rowIndex, col, kind, active, interacting: inMode, hintId })}
            className={cn(cellClass(meta), kind !== 'widget' && focusableCellClass)}
          >
            {kind === 'widget' ? (
              <WidgetTarget active={active}>{content}</WidgetTarget>
            ) : kind === 'composite' ? (
              <CompositeControls interacting={inMode}>{content}</CompositeControls>
            ) : (
              content
            )}
          </td>
        )
      })}
    </tr>
  )
})

function Body({
  table,
  hintId,
  virtualizer,
}: {
  table: DataTableModel<RowData>
  hintId: string
  /** Set while virtualizing: only its range of rows is rendered. */
  virtualizer: Virtualizer<HTMLDivElement, HTMLTableRowElement> | null
}) {
  const { rows, activeCell, interacting, selectable, selection, dataState, params, instance } =
    table
  /*
   * aria-rowindex is PAGE-GLOBAL: (page - 1) * pageSize + i + 2 (the header is
   * row 1). A screen reader then says "row 52 of 4,214" on page 2, matching
   * "Showing 51–100 of 4,213" in the pagination bar; page-local indices would
   * say "row 2" on every page. Taken from the page the rows came from, so a
   * placeholder page (the previous page's rows, while the next loads) keeps
   * its own numbers.
   */
  const shown = dataState.status === 'ready' ? dataState.data : params
  const rowOffset = (shown.page - 1) * shown.pageSize + 2
  const columnsKey = instance
    .getVisibleLeafColumns()
    .map((column) => column.id)
    .join(',')

  const renderRow = (rowIndex: number, virtualStart?: number) => {
    const row = rows[rowIndex]
    if (!row) return null
    return (
      <GridRow
        key={row.id}
        row={row}
        rowIndex={rowIndex}
        rowOffset={rowOffset}
        isSelected={selectable ? selection.isSelected(row.id) : undefined}
        activeCol={activeCell.row === rowIndex ? activeCell.col : null}
        interacting={interacting && activeCell.row === rowIndex}
        columnsKey={columnsKey}
        hintId={hintId}
        virtualStart={virtualStart}
        last={virtualStart !== undefined && rowIndex === rows.length - 1}
      />
    )
  }

  if (virtualizer) {
    // Item starts include scrollMargin (the sticky header above the tbody):
    // subtract it to position rows inside the tbody.
    const margin = virtualizer.options.scrollMargin
    return (
      <tbody
        role="rowgroup"
        className="relative block"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => renderRow(item.index, item.start - margin))}
      </tbody>
    )
  }

  return (
    <tbody role="rowgroup" className="grid divide-y divide-border">
      {rows.map((_, rowIndex) => renderRow(rowIndex))}
    </tbody>
  )
}

/** Fallback row height (the comfortable --row-height) until the container is measured. */
const DEFAULT_ROW_HEIGHT = 52

/**
 * The scroll container's --row-height in px, re-read whenever a data-density
 * attribute changes anywhere in the document (<html> or a subtree override).
 */
function useRowHeight(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  const [height, setHeight] = useState(DEFAULT_ROW_HEIGHT)
  useLayoutEffect(() => {
    const element = ref.current
    if (!enabled || !element) return
    const measure = () => {
      const px = Number.parseFloat(getComputedStyle(element).getPropertyValue('--row-height'))
      if (px > 0) setHeight(px)
    }
    measure()
    const observer = new MutationObserver(measure)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-density'],
      subtree: true,
    })
    return () => observer.disconnect()
  }, [ref, enabled])
  return height
}

/** Scrolls the container horizontally so the focused cell's column is in view. */
function revealColumn(container: HTMLElement, target: HTMLElement) {
  const cell = posOf(target)?.cell ?? target
  const box = container.getBoundingClientRect()
  const rect = cell.getBoundingClientRect()
  if (rect.left < box.left) container.scrollLeft -= box.left - rect.left
  else if (rect.right > box.right) {
    // A cell wider than the container: align its start rather than its end.
    container.scrollLeft += Math.min(rect.right - box.right, rect.left - box.left)
  }
}

export interface VirtualizeOptions {
  /** Virtualize only when the page has more rows than this. Default 100. */
  threshold?: number
  /** Rows rendered beyond each edge of the viewport. Default 8. */
  overscan?: number
}

const DEFAULT_VIRTUALIZE_THRESHOLD = 100
const DEFAULT_OVERSCAN = 8

/**
 * Row virtualization (@tanstack/react-virtual) on the grid's own scroll
 * container: fixed-height rows (--row-height), only the visible range (plus
 * overscan, plus the active row) rendered. Inactive (null) at or under the
 * threshold, where every row renders as before.
 */
function useRowVirtualizer(
  table: DataTableModel<RowData>,
  virtualize: VirtualizeOptions | false | undefined,
) {
  const { rows, activeCell } = table
  const { hasBulkBar } = useDataTableContext('Grid')
  const { threshold = DEFAULT_VIRTUALIZE_THRESHOLD, overscan = DEFAULT_OVERSCAN } =
    virtualize || {}
  const active = virtualize !== false && rows.length > threshold

  const scrollRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLTableSectionElement>(null)
  const rowHeight = useRowHeight(scrollRef, active)
  // The sticky header sits above the tbody inside the scroll container: rows
  // start that far down (scrollMargin), and scrollToIndex keeps them clear of
  // it (scrollPaddingStart). 44px (h-11) + its 1px border until measured.
  const [headHeight, setHeadHeight] = useState(45)
  useLayoutEffect(() => {
    if (active && headRef.current) setHeadHeight(headRef.current.offsetHeight)
  }, [active, rowHeight])
  const barSpace = hasBulkBarSpace(hasBulkBar, table) ? BULK_BAR_SPACE : 0

  const activeRow = activeCell.row
  // The default range PLUS the active row: the focused row must never unmount
  // when it's scrolled out of view. Otherwise focus drops to <body> and the
  // arrow keys stop working (the grid's keydown handler only sees events from
  // inside it).
  const rangeExtractor = useCallback(
    (range: Range) => {
      const indexes = defaultRangeExtractor(range)
      if (activeRow >= 0 && activeRow < range.count && !indexes.includes(activeRow)) {
        indexes.push(activeRow)
        indexes.sort((a, b) => a - b) // DOM order = row order, for screen readers
      }
      return indexes
    },
    [activeRow],
  )

  const virtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    enabled: active,
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan,
    rangeExtractor,
    scrollMargin: headHeight,
    scrollPaddingStart: headHeight,
    scrollPaddingEnd: barSpace,
    // Scroll updates render in the next frame instead of a flushSync, which
    // React warns about when it lands inside a commit (scrollToIndex is called
    // from useGridState's layout effect).
    useFlushSync: false,
  })

  // Sizes are cached per item: a new row height (density) needs a re-measure.
  useLayoutEffect(() => {
    if (active) virtualizer.measure()
  }, [virtualizer, active, rowHeight])

  // Let useGridState scroll rows into view through the virtualizer.
  const { scrollerRef } = table.grid
  useLayoutEffect(() => {
    if (!active) return
    const scroller: GridScroller = {
      reveal: (row, target) => {
        virtualizer.scrollToIndex(row, { align: 'auto' })
        const container = scrollRef.current
        if (target && container) revealColumn(container, target)
      },
    }
    scrollerRef.current = scroller
    return () => {
      if (scrollerRef.current === scroller) scrollerRef.current = null
    }
  }, [active, virtualizer, scrollerRef])

  // PageUp / PageDown move by the rows that fit in the viewport (minus the
  // header and the bulk bar's room), at least 1.
  const viewport = virtualizer.scrollRect?.height ?? 0
  const pageStep = active
    ? Math.max(1, Math.floor((viewport - headHeight - barSpace) / rowHeight))
    : DEFAULT_PAGE_STEP

  return { virtualizer: active ? virtualizer : null, scrollRef, headRef, pageStep }
}

/** The ready grid: keyboard model, cell context, rows. */
function LiveGrid({
  table,
  label,
  className,
  virtualize,
}: {
  table: DataTableModel<RowData>
  label: string
  className?: string
  virtualize: VirtualizeOptions | false | undefined
}) {
  const { keyboardHelpRef } = useDataTableContext('Grid')
  const { virtualizer, scrollRef, headRef, pageStep } = useRowVirtualizer(table, virtualize)
  const { gridProps } = useGridKeyboard(table, {
    pageStep,
    // "?" opens DataTable.KeyboardHelp when it's rendered (it registers itself).
    openHelp: () => {
      const open = keyboardHelpRef.current
      open?.()
      return open !== null
    },
  })
  const hintId = useId()
  const { selection, getRowLabel, setParams } = table
  const cellContext = useMemo(
    () => ({ selection, label, getRowLabel }),
    [selection, label, getRowLabel],
  )
  const hasComposite = table.instance
    .getVisibleLeafColumns()
    .some((column) => column.columnDef.meta?.cellKind === 'composite')

  return (
    <DataTableCellContext value={cellContext}>
      <DataTableParamsContext value={setParams}>
        {hasComposite ? <VisuallyHidden id={hintId}>{INTERACT_HINT}</VisuallyHidden> : null}
        <GridTable
          table={table}
          label={label}
          interactive
          className={className}
          gridProps={gridProps}
          scrollRef={scrollRef}
          headRef={headRef}
        >
          <Body table={table} hintId={hintId} virtualizer={virtualizer} />
        </GridTable>
      </DataTableParamsContext>
    </DataTableCellContext>
  )
}

/**
 * Polite announcements, never for the initial load:
 *  - once data SETTLES (ready and not a placeholder, so never about rows that
 *    aren't on screen yet): "Sorted by Amount, descending" when the sort
 *    changed, "Showing 51–100 of 4,213" when the visible range changed;
 *  - selection, debounced: "12 selected" / "Selection cleared".
 *
 * A view change (new sort, filter or q) also clears the selection. That
 * "Selection cleared" joins the settle message ("Sorted by Amount,
 * descending. Selection cleared") instead of being a second announcement: the
 * announcer keeps only the last of two messages that arrive close together,
 * so one of them would be lost.
 */
function useGridAnnouncements(table: DataTableModel<RowData>) {
  const announce = useAnnounce()
  const { dataState, params, total, columns, selection } = table
  const settled = dataState.status === 'ready' && !dataState.isPlaceholder
  const { from, to } = pageRange({ page: params.page, pageSize: params.pageSize, total })
  const range = `Showing ${formatNumber(from)}–${formatNumber(to)} of ${formatNumber(total)}`
  const viewKey = viewKeyOf(params)
  const count = selection.count

  const lastSelection = useRef({ count, viewKey })
  const clearedByView = useRef(false)
  const last = useRef<{ sort: Sort; range: string; viewKey: string } | null>(null)

  // Declared first: in a commit where both change, this runs before the settle effect.
  useEffect(() => {
    const before = lastSelection.current
    lastSelection.current = { count, viewKey }
    if (before.count === count) return
    if (before.viewKey !== viewKey) {
      if (count === 0) clearedByView.current = true
      return
    }
    const timer = setTimeout(
      () => announce(count === 0 ? 'Selection cleared' : `${formatNumber(count)} selected`),
      SELECTION_ANNOUNCE_DELAY_MS,
    )
    // A newer count (the next click) replaces this one: that's the debounce.
    return () => clearTimeout(timer)
  }, [count, viewKey, announce])

  useEffect(() => {
    if (!settled) return
    const before = last.current
    last.current = { sort: params.sort, range, viewKey }
    if (!before) return // the initial load: nothing changed from the user's point of view

    const messages: string[] = []
    if (before.sort !== params.sort) {
      messages.push(sortAnnouncement(params.sort, before.sort, columns as ColumnLike[]))
    }
    if (before.range !== range) messages.push(range)
    if (clearedByView.current) {
      clearedByView.current = false
      messages.push('Selection cleared')
    }
    if (messages.length > 0) announce(messages.join('. '))
  }, [settled, params.sort, range, viewKey, columns, announce])
}

export interface DataTableGridProps {
  /** Goes on the scroll container: cap the height here, e.g. "max-h-[32rem]". Default: none. */
  className?: string
  /**
   * Row virtualization for large pages, on by default above 100 rows. Needs a
   * bounded scroll container (className) to have any effect. false: off.
   */
  virtualize?: VirtualizeOptions | false
}

/**
 * The table itself, inside a DataBoundary: a skeleton that mirrors it while
 * loading, the empty / no-results / error states in its place, and the
 * refetch bar, stale banner and placeholder dimming over the rows. Once there
 * are rows it's an ARIA grid with keyboard navigation (docs/keyboard-grid.md).
 */
export function DataTableGrid({ className, virtualize }: DataTableGridProps) {
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
        <LiveGrid table={table} label={label} className={className} virtualize={virtualize} />
      )}
    </DataBoundary>
  )
}
