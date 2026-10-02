import type { SortingState, Updater } from '@tanstack/react-table'
import { DEFAULT_LIST_PARAMS, type ListParams, type Sort, type SortField } from '@/contracts'
import { setSort } from '@/lib/url-state'
import type { DataColumnMeta, DataColumnWidth } from './columns'

/*
 * The pure half of the table: URL params → TanStack state, and back.
 * No React here, so every rule is a table-driven unit test.
 */

/** What the model needs from a column: its id and meta. ColumnDef and Column both fit. */
export interface ColumnLike {
  id?: string
  accessorKey?: unknown
  meta?: DataColumnMeta
}

/** A column's id as TanStack resolves it: `id`, else the accessor key (dots kept). */
export function columnIdOf(column: ColumnLike): string | undefined {
  if (column.id) return column.id
  return typeof column.accessorKey === 'string' ? column.accessorKey : undefined
}

export function parseSort(sort: Sort): { field: SortField; desc: boolean } {
  return sort.startsWith('-')
    ? { field: sort.slice(1) as SortField, desc: true }
    : { field: sort as SortField, desc: false }
}

/**
 * `params.sort` → TanStack's SortingState. "-amount" → the column whose
 * meta.sortField is 'amount', descending. A field no column maps to gives [],
 * so no header claims a sort it doesn't show.
 */
export function sortingFromParams(sort: Sort, columns: readonly ColumnLike[]): SortingState {
  const { field, desc } = parseSort(sort)
  const column = columns.find((candidate) => candidate.meta?.sortField === field)
  const id = column && columnIdOf(column)
  return id ? [{ id, desc }] : []
}

export function sortFieldOf(
  columnId: string | undefined,
  columns: readonly ColumnLike[],
): SortField | undefined {
  if (columnId === undefined) return undefined
  return columns.find((column) => columnIdOf(column) === columnId)?.meta?.sortField
}

/**
 * TanStack's onSortingChange → the URL action. TanStack proposes a next
 * SortingState from its own cycle; we only take WHICH column was toggled from
 * it (the proposed column, or the current one when it proposes removal) and
 * let setSort apply the kit's cycle: none → desc → asc → default.
 * Returns undefined when the toggled column isn't sortable.
 */
export function sortUpdaterFor(
  updater: Updater<SortingState>,
  current: SortingState,
  columns: readonly ColumnLike[],
): ((prev: ListParams) => ListParams) | undefined {
  const next = typeof updater === 'function' ? updater(current) : updater
  const toggledId = next[0]?.id ?? current[0]?.id
  const field = sortFieldOf(toggledId, columns)
  return field ? setSort(field) : undefined
}

export type SortAction = 'sort descending' | 'sort ascending' | 'clear sort'

/** What clicking this column's header will do, from the same cycle setSort applies. */
export function nextSortAction(field: SortField, params: ListParams): SortAction {
  const next = setSort(field)(params).sort
  if (next === `-${field}`) return 'sort descending'
  if (next === field) return 'sort ascending'
  return 'clear sort'
}

export function isDefaultSort(sort: Sort): boolean {
  return sort === DEFAULT_LIST_PARAMS.sort
}

export interface PageRange {
  /** 1-based index of the first row shown; 0 when there are none. */
  from: number
  /** 1-based index of the last row shown; 0 when there are none. */
  to: number
  total: number
  /** ceil(total / pageSize); 0 when total is 0. */
  pageCount: number
}

/** "Showing from–to of total", for a 1-based page. The last page can be partial. */
export function pageRange({
  page,
  pageSize,
  total,
}: {
  page: number
  pageSize: number
  total: number
}): PageRange {
  const pageCount = Math.ceil(total / pageSize)
  if (total === 0) return { from: 0, to: 0, total, pageCount }
  const from = Math.min((page - 1) * pageSize + 1, total)
  return { from, to: Math.min(page * pageSize, total), total, pageCount }
}

function labelOfField(field: string, columns: readonly ColumnLike[]): string {
  return columns.find((column) => column.meta?.sortField === field)?.meta?.label ?? field
}

/** "Sorted by Amount, descending"; back at the default order: "Sort cleared, back to Created, descending". */
export function sortAnnouncement(
  sort: Sort,
  previous: Sort,
  columns: readonly ColumnLike[],
): string {
  const { field, desc } = parseSort(sort)
  const order = `${labelOfField(field, columns)}, ${desc ? 'descending' : 'ascending'}`
  return isDefaultSort(sort) && parseSort(previous).field !== field
    ? `Sort cleared, back to ${order}`
    : `Sorted by ${order}`
}

const DEFAULT_WIDTH: DataColumnWidth = { min: 120 }

/** One CSS grid track per column: minmax(min, ideal | 1fr). */
export function gridTemplateColumns(columns: readonly ColumnLike[]): string {
  return columns
    .map((column) => {
      const { min, ideal, grow } = column.meta?.width ?? DEFAULT_WIDTH
      const max = grow || ideal === undefined ? '1fr' : `${ideal}px`
      return `minmax(${min}px, ${max})`
    })
    .join(' ')
}

/** The narrowest the table can be before it scrolls horizontally. */
export function minTableWidth(columns: readonly ColumnLike[]): number {
  return columns.reduce((sum, column) => sum + (column.meta?.width ?? DEFAULT_WIDTH).min, 0)
}

export const PAGE_SIZE_OPTIONS = [25, 50, 100, 500] as const

export const SEARCH_DEBOUNCE_MS = 300

/** "Orders" → "order": the singular row noun, from the table label. */
export function singularNoun(label: string): string {
  return label.toLowerCase().replace(/s$/, '')
}

/** "1 order", "50 orders", from the table label ("Orders"). */
export function countOf(count: number, label: string): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? singularNoun(label) : label.toLowerCase()}`
}
