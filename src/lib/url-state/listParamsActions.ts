import {
  DEFAULT_LIST_PARAMS,
  type Filter,
  type FilterField,
  type ListParams,
  type Sort,
  type SortField,
} from '@/contracts'

/*
 * Pure updaters (prev → next) for setParams, so components stay thin:
 *   setParams(setSort('amount'))
 *   setParams(setQuery(text), { history: 'replace' })
 * Page resets are not done here; useListParams applies that rule to every update.
 */

type Updater = (prev: ListParams) => ListParams

/**
 * Column-header sort cycle for `field`:
 *   not sorted by field → descending ("-amount") → ascending ("amount") → `defaultSort`
 * Big-first is the useful first click on a dashboard (largest amount, newest date).
 * When `field` is the default sort's own field the cycle is just desc ↔ asc.
 */
export function setSort(field: SortField, defaultSort: Sort = DEFAULT_LIST_PARAMS.sort): Updater {
  return (prev) => {
    if (prev.sort === `-${field}`) return { ...prev, sort: field }
    if (prev.sort === field && defaultSort !== field) return { ...prev, sort: defaultSort }
    return { ...prev, sort: `-${field}` }
  }
}

export function setPage(page: number): Updater {
  return (prev) => ({ ...prev, page: Math.max(1, Math.trunc(page)) })
}

export function setPageSize(pageSize: number): Updater {
  return (prev) => ({ ...prev, pageSize })
}

/** Use with `{ history: 'replace' }`: keystrokes shouldn't each become a Back step. */
export function setQuery(q: string): Updater {
  return (prev) => ({ ...prev, q: q.trim() ? q : undefined })
}

/**
 * The op family a filter belongs to. A field holds at most one filter per
 * family: one `in` list, and one numeric/date constraint (gt, lt or between).
 */
function opFamily(op: Filter['op']): 'in' | 'range' {
  return op === 'in' ? 'in' : 'range'
}

const sameSlot = (a: Filter, b: Filter) => a.field === b.field && opFamily(a.op) === opFamily(b.op)

/** Add `filter`, replacing any filter on the same field and op family (amount > 10 replaces amount between 0..5). */
export function upsertFilter(filter: Filter): Updater {
  return (prev) => ({
    ...prev,
    filters: [...prev.filters.filter((existing) => !sameSlot(existing, filter)), filter],
  })
}

export function removeFilter(field: FilterField): Updater {
  return (prev) => ({ ...prev, filters: prev.filters.filter((filter) => filter.field !== field) })
}

export function clearFilters(): Updater {
  return (prev) => ({ ...prev, filters: [] })
}
