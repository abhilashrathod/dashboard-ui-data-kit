import type { Filter, FilterField, ListParams } from '@/contracts'
import { MINUS } from '@/lib/format'
import type { DataColumnFilter } from '../columns'
import type { ColumnLike } from '../model'

/*
 * Pure helpers for DataTable.Filters: which columns filter, what the active
 * filter on a field is, how it reads as a pill, and the date presets.
 */

export interface FilterableColumn {
  label: string
  filter: DataColumnFilter
}

/** Columns with meta.filter, in column order. */
export function filterableColumns(columns: readonly ColumnLike[]): FilterableColumn[] {
  return columns.flatMap((column) =>
    column.meta?.filter ? [{ label: column.meta.label, filter: column.meta.filter }] : [],
  )
}

export type EnumFilter = Extract<Filter, { op: 'in' }>
export type AmountFilter = Extract<Filter, { field: 'amount' }>
export type DateFilter = Extract<Filter, { field: 'createdAt' }>

/** The filter the pill for `field` edits. A field holds at most one per op family, and each pill edits one family. */
export function activeFilter(params: ListParams, field: FilterField): Filter | undefined {
  return params.filters.find((filter) => filter.field === field)
}

// ── Dates ────────────────────────────────────────────────────────────────────

/** yyyy-mm-dd for a LOCAL calendar day. */
export function toIsoDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
] as const
export type DatePresetId = (typeof DATE_PRESETS)[number]['id']

/**
 * An inclusive [from, to] range of yyyy-mm-dd days, computed from the LOCAL
 * today (`now`), so "Today" is the user's today, not UTC's.
 */
export function datePresetRange(id: DatePresetId, now: Date = new Date()): [string, string] {
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  const day = (offset: number) => toIsoDay(new Date(y, m, d + offset))
  switch (id) {
    case 'today':
      return [day(0), day(0)]
    case 'last7':
      return [day(-6), day(0)]
    case 'last30':
      return [day(-29), day(0)]
    case 'thisMonth':
      return [toIsoDay(new Date(y, m, 1)), day(0)]
    case 'lastMonth':
      // Day 0 of this month is the last day of the previous one.
      return [toIsoDay(new Date(y, m - 1, 1)), toIsoDay(new Date(y, m, 0))]
  }
}

/** The preset a range equals today, if any. */
export function matchDatePreset(
  [from, to]: readonly [string, string],
  now: Date = new Date(),
): (typeof DATE_PRESETS)[number] | undefined {
  return DATE_PRESETS.find((preset) => {
    const [presetFrom, presetTo] = datePresetRange(preset.id, now)
    return presetFrom === from && presetTo === to
  })
}

/** Days are calendar days, so format them in UTC (no zone shift). */
const shortDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const shortDayYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "Jan 1", or "Jan 1, 2025" outside the current year. */
function formatDay(iso: string, now: Date): string {
  const date = new Date(`${iso}T00:00:00Z`)
  return (date.getUTCFullYear() === now.getFullYear() ? shortDay : shortDayYear).format(date)
}

// ── Summaries ────────────────────────────────────────────────────────────────

/** "$500", "$1,250.50": no cents unless there are some. */
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})
export const formatMoney = (value: number) => money.format(value).replace('-', MINUS)

/** What an active pill says: "Status: Paid, Shipped", "Amount > $500", "Created: Last 7 days". */
export function filterSummary(
  column: FilterableColumn,
  filter: Filter,
  now: Date = new Date(),
): string {
  const { label } = column
  if (filter.op === 'in') {
    if (filter.value.length > 2) return `${label}: ${filter.value.length} selected`
    const options = column.filter.type === 'enum' ? column.filter.options : []
    const names = filter.value.map(
      (value) => options.find((option) => option.value === value)?.label ?? value,
    )
    return `${label}: ${names.join(', ')}`
  }
  if (filter.field === 'amount') {
    if (filter.op === 'between') {
      return `${label} ${formatMoney(filter.value[0])}–${formatMoney(filter.value[1])}`
    }
    return `${label} ${filter.op === 'gt' ? '>' : '<'} ${formatMoney(filter.value)}`
  }
  const preset = matchDatePreset(filter.value, now)
  if (preset) return `${label}: ${preset.label}`
  const [from, to] = filter.value
  return from === to
    ? `${label}: ${formatDay(from, now)}`
    : `${label}: ${formatDay(from, now)} – ${formatDay(to, now)}`
}
