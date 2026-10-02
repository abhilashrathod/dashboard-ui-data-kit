import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Checkbox, IconButton, SearchInput, Select } from '@/components'
import { SORT_FIELDS, type Filter, type ListParams, type Sort, type SortField } from '@/contracts'
import {
  removeFilter,
  setPage,
  setPageSize,
  setQuery,
  setSort,
  upsertFilter,
  type ParamsUpdater,
  type NavigateOptions,
} from '@/lib/url-state'

const PAGE_SIZES = ['10', '25', '50', '100'].map((value) => ({ value, label: `${value} rows` }))
const SEARCH_DEBOUNCE_MS = 300

function createDebouncer(ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    run: (fn: () => void) => {
      clearTimeout(timer)
      timer = setTimeout(fn, ms)
    },
    cancel: () => clearTimeout(timer),
  }
}

function statusValues(params: ListParams): readonly string[] {
  for (const filter of params.filters) {
    if (filter.op === 'in' && filter.field === 'status') return filter.value
  }
  return []
}

/** Toggle one status in the status `in` filter, dropping the filter when it empties. */
function toggleStatus(status: string) {
  return (prev: ListParams): ListParams => {
    const current = statusValues(prev)
    const value = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status]
    if (value.length === 0) return removeFilter('status')(prev)
    const filter: Filter = { field: 'status', op: 'in', value }
    return upsertFilter(filter)(prev)
  }
}

/**
 * The search box keeps an uncommitted draft while you type; that's input
 * state, not a copy of the URL. When the URL's q changes from outside (Back,
 * Reset) the draft follows, using React's "adjust state while rendering"
 * pattern rather than an effect.
 */
function SearchBox({
  q,
  onCommit,
  label,
}: {
  q: string
  onCommit: (q: string) => void
  label: string
}) {
  const [draft, setDraft] = useState(q)
  const [seenQ, setSeenQ] = useState(q)
  const [debouncer] = useState(() => createDebouncer(SEARCH_DEBOUNCE_MS))
  useEffect(() => debouncer.cancel, [debouncer])

  if (q !== seenQ) {
    setSeenQ(q)
    // Our own commit echoing back (maybe trimmed) must not clobber what's being typed.
    if (draft.trim() !== q) setDraft(q)
  }

  return (
    <SearchInput
      aria-label={label}
      placeholder="Search customer or order id"
      value={draft}
      onChange={(event) => {
        const next = event.target.value
        setDraft(next)
        debouncer.run(() => onCommit(next))
      }}
    />
  )
}

export interface ListParamsControlsProps {
  params: ListParams
  setParams: (updater: ParamsUpdater, opts?: NavigateOptions) => void
  /** Used in the search box's accessible name ("Search orders"). */
  title: string
  /** The list's default sort, where the sort cycle ends. */
  defaultSort?: Sort
}

/**
 * Dev-only: every list-param control (search, sort, page, page size, a status
 * filter), each wired to one setParams call. Shared by the URL-state and
 * URL ↔ Query demos. No state mirrors the URL; only the search draft is local.
 */
export function ListParamsControls({
  params,
  setParams,
  title,
  defaultSort,
}: ListParamsControlsProps) {
  const paid = statusValues(params).includes('paid')
  const sortIcon = (field: SortField) =>
    params.sort === `-${field}` ? <ArrowDown /> : params.sort === field ? <ArrowUp /> : undefined

  return (
    <>
      <SearchBox
        label={`Search ${title}`}
        q={params.q ?? ''}
        onCommit={(q) => setParams(setQuery(q), { history: 'replace' })}
      />

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sort">
        {SORT_FIELDS.map((field) => (
          <Button
            key={field}
            size="sm"
            variant={params.sort.replace('-', '') === field ? 'secondary' : 'outline'}
            leftIcon={sortIcon(field)}
            aria-label={`Sort by ${field}`}
            onClick={() => setParams(setSort(field, defaultSort))}
          >
            {field}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Previous page"
            disabled={params.page === 1}
            onClick={() => setParams(setPage(params.page - 1))}
          >
            <ChevronLeft />
          </IconButton>
          <span className="min-w-14 text-center text-sm tabular-nums" data-testid="page">
            Page {params.page}
          </span>
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Next page"
            onClick={() => setParams(setPage(params.page + 1))}
          >
            <ChevronRight />
          </IconButton>
        </div>
        <Select
          aria-label="Rows per page"
          size="sm"
          className="w-32"
          options={PAGE_SIZES}
          value={String(params.pageSize)}
          onValueChange={(value) => setParams(setPageSize(Number(value)))}
        />
        <Checkbox
          label="Paid only"
          checked={paid}
          onChange={() => setParams(toggleStatus('paid'))}
        />
      </div>
    </>
  )
}
