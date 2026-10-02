import { describe, expect, it } from 'vitest'
import { withDefaults, type ListParams } from '@/contracts'
import { orderColumns } from '@/features/orders/orderColumns'
import type { ColumnLike } from '../model'
import {
  gridTemplateColumns,
  minTableWidth,
  nextSortAction,
  pageRange,
  sortAnnouncement,
  sortingFromParams,
  sortUpdaterFor,
} from '../model'

const columns = orderColumns as readonly ColumnLike[]
const params = (partial: Partial<ListParams> = {}) => withDefaults(partial)

describe('sortingFromParams', () => {
  it.each([
    ['-amount', [{ id: 'amount', desc: true }]],
    ['amount', [{ id: 'amount', desc: false }]],
    ['customer', [{ id: 'customer', desc: false }]],
    ['-createdAt', [{ id: 'createdAt', desc: true }]],
  ] as const)('%s → %j', (sort, expected) => {
    expect(sortingFromParams(sort, columns)).toEqual(expected)
  })

  it('finds the column by meta.sortField, not by id', () => {
    const renamed: ColumnLike[] = [{ id: 'total', meta: { label: 'Total', sortField: 'amount' } }]
    expect(sortingFromParams('-amount', renamed)).toEqual([{ id: 'total', desc: true }])
  })

  it('gives [] when no column maps to the field', () => {
    const unsortable: ColumnLike[] = [{ id: 'amount', meta: { label: 'Amount' } }]
    expect(sortingFromParams('-amount', unsortable)).toEqual([])
    expect(sortingFromParams('status', [])).toEqual([])
  })
})

describe('sortUpdaterFor (onSortingChange → setSort)', () => {
  const apply = (sort: ListParams['sort'], proposed: { id: string; desc: boolean }[]) => {
    const current = sortingFromParams(sort, columns)
    const update = sortUpdaterFor(() => proposed, current, columns)
    return update?.(params({ sort })).sort
  }

  it('applies the kit cycle whatever direction TanStack proposes', () => {
    // none → desc → asc → default
    expect(apply('-createdAt', [{ id: 'amount', desc: false }])).toBe('-amount')
    expect(apply('-amount', [{ id: 'amount', desc: false }])).toBe('amount')
    expect(apply('amount', [{ id: 'amount', desc: true }])).toBe('-createdAt')
  })

  it('treats a proposed removal as a toggle of the current column', () => {
    expect(apply('amount', [])).toBe('-createdAt')
    expect(apply('-amount', [])).toBe('amount')
  })

  it('accepts a plain value as well as an updater function', () => {
    const update = sortUpdaterFor([{ id: 'status', desc: false }], [], columns)
    expect(update?.(params()).sort).toBe('-status')
  })

  it('ignores a column without a sortField', () => {
    expect(sortUpdaterFor([{ id: 'channel', desc: false }], [], columns)).toBeUndefined()
    expect(sortUpdaterFor([], [], columns)).toBeUndefined()
  })
})

describe('nextSortAction (what the header button says)', () => {
  it.each([
    ['amount', '-createdAt', 'sort descending'],
    ['amount', '-amount', 'sort ascending'],
    ['amount', 'amount', 'clear sort'],
    // The default sort's own column just flips.
    ['createdAt', '-createdAt', 'sort ascending'],
    ['createdAt', 'createdAt', 'sort descending'],
  ] as const)('%s while sorted by %s → %s', (field, sort, expected) => {
    expect(nextSortAction(field, params({ sort }))).toBe(expected)
  })
})

describe('pageRange', () => {
  it.each([
    [
      { page: 1, pageSize: 50, total: 4213 },
      { from: 1, to: 50, total: 4213, pageCount: 85 },
    ],
    [
      { page: 2, pageSize: 50, total: 4213 },
      { from: 51, to: 100, total: 4213, pageCount: 85 },
    ],
    // The last page is partial.
    [
      { page: 85, pageSize: 50, total: 4213 },
      { from: 4201, to: 4213, total: 4213, pageCount: 85 },
    ],
    [
      { page: 1, pageSize: 25, total: 25 },
      { from: 1, to: 25, total: 25, pageCount: 1 },
    ],
    [
      { page: 1, pageSize: 50, total: 0 },
      { from: 0, to: 0, total: 0, pageCount: 0 },
    ],
  ])('%j → %j', (input, expected) => {
    expect(pageRange(input)).toEqual(expected)
  })
})

describe('grid tracks', () => {
  it('builds minmax(min, ideal | 1fr) per column', () => {
    expect(
      gridTemplateColumns([
        { id: 'a', meta: { label: 'A', width: { min: 80, ideal: 96 } } },
        { id: 'b', meta: { label: 'B', width: { min: 200, ideal: 240, grow: true } } },
        { id: 'c', meta: { label: 'C', width: { min: 100 } } },
        { id: 'd', meta: { label: 'D' } },
      ]),
    ).toBe('minmax(80px, 96px) minmax(200px, 1fr) minmax(100px, 1fr) minmax(120px, 1fr)')
  })

  it('sums the minimums for the horizontal-scroll threshold', () => {
    expect(minTableWidth(columns)).toBe(120 + 240 + 128 + 132 + 80 + 120 + 148)
  })
})

describe('sortAnnouncement', () => {
  it('names the column and direction', () => {
    expect(sortAnnouncement('-amount', '-createdAt', columns)).toBe('Sorted by Amount, descending')
    expect(sortAnnouncement('amount', '-amount', columns)).toBe('Sorted by Amount, ascending')
  })

  it('says the sort was cleared when it returns to the default from another column', () => {
    expect(sortAnnouncement('-createdAt', 'amount', columns)).toBe(
      'Sort cleared, back to Created, descending',
    )
    expect(sortAnnouncement('-createdAt', 'createdAt', columns)).toBe(
      'Sorted by Created, descending',
    )
  })
})
