import { describe, expect, it } from 'vitest'
import { DEFAULT_LIST_PARAMS, type Filter, type ListParams } from '@/contracts'
import {
  clearFilters,
  removeFilter,
  setPage,
  setPageSize,
  setQuery,
  setSort,
  upsertFilter,
} from '../listParamsActions'

const base: ListParams = { ...DEFAULT_LIST_PARAMS, filters: [] }
const paid: Filter = { field: 'status', op: 'in', value: ['paid'] }
const web: Filter = { field: 'channel', op: 'in', value: ['web'] }
const over100: Filter = { field: 'amount', op: 'gt', value: 100 }

describe('setSort', () => {
  it('cycles none → desc → asc → default', () => {
    const toggle = setSort('amount')
    const desc = toggle(base)
    expect(desc.sort).toBe('-amount')
    const asc = toggle(desc)
    expect(asc.sort).toBe('amount')
    expect(toggle(asc).sort).toBe(DEFAULT_LIST_PARAMS.sort)
  })

  it('switching column starts that column at desc', () => {
    expect(setSort('customer')({ ...base, sort: 'amount' }).sort).toBe('-customer')
  })

  it("toggles desc ↔ asc on the default sort's own field", () => {
    const toggle = setSort('createdAt')
    expect(toggle(base).sort).toBe('createdAt')
    expect(toggle({ ...base, sort: 'createdAt' }).sort).toBe('-createdAt')
  })

  it('returns to a custom default', () => {
    expect(setSort('amount', 'customer')({ ...base, sort: 'amount' }).sort).toBe('customer')
  })
})

describe('setPage, setPageSize, setQuery', () => {
  it('sets the page (at least 1, whole numbers)', () => {
    expect(setPage(4)(base).page).toBe(4)
    expect(setPage(0)(base).page).toBe(1)
    expect(setPage(2.7)(base).page).toBe(2)
  })

  it('sets the page size', () => {
    expect(setPageSize(25)(base).pageSize).toBe(25)
  })

  it('sets q, and clears it for blank input', () => {
    expect(setQuery('acme')(base).q).toBe('acme')
    expect(setQuery('   ')({ ...base, q: 'acme' }).q).toBeUndefined()
  })
})

describe('filters', () => {
  it('upsert adds a new field', () => {
    expect(upsertFilter(web)({ ...base, filters: [paid] }).filters).toEqual([paid, web])
  })

  it('upsert replaces the filter on the same field', () => {
    const shipped: Filter = { field: 'status', op: 'in', value: ['shipped'] }
    expect(upsertFilter(shipped)({ ...base, filters: [paid, web] }).filters).toEqual([web, shipped])
  })

  it('upsert treats gt, lt and between as one family', () => {
    const range: Filter = { field: 'amount', op: 'between', value: [10, 20] }
    expect(upsertFilter(range)({ ...base, filters: [over100] }).filters).toEqual([range])
  })

  it('removes by field', () => {
    expect(removeFilter('status')({ ...base, filters: [paid, web] }).filters).toEqual([web])
  })

  it('clears all filters', () => {
    expect(clearFilters()({ ...base, filters: [paid, web, over100] }).filters).toEqual([])
  })
})
