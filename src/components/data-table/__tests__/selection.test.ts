import { describe, expect, it } from 'vitest'
import { withDefaults } from '@/contracts'
import {
  clearPage,
  emptySelection,
  pageKeyOf,
  pageSelectionState,
  removeIds,
  selectPage,
  toggleRow,
  viewKeyOf,
  type PageRows,
  type SelectionState,
} from '../selection'

type Row = { id: string }
const page = (key: string, ids: string[]): PageRows<Row> => ({
  key,
  rows: ids.map((id) => ({ id, row: { id } })),
})
const PAGE_1 = page('1:5', ['a', 'b', 'c', 'd', 'e'])
const PAGE_2 = page('2:5', ['f', 'g', 'h', 'i', 'j'])
const ids = (state: SelectionState<Row>) => [...state.rows.keys()]
const start = () => emptySelection<Row>('view')

describe('viewKeyOf', () => {
  const base = withDefaults({ sort: '-amount', q: 'acme' })

  it('ignores page and page size', () => {
    expect(viewKeyOf({ ...base, page: 3 })).toBe(viewKeyOf(base))
    expect(viewKeyOf({ ...base, pageSize: 100 })).toBe(viewKeyOf(base))
  })

  it('changes with sort, q and filters', () => {
    expect(viewKeyOf({ ...base, sort: 'amount' })).not.toBe(viewKeyOf(base))
    expect(viewKeyOf({ ...base, q: 'globex' })).not.toBe(viewKeyOf(base))
    expect(
      viewKeyOf({ ...base, filters: [{ field: 'status', op: 'in', value: ['paid'] }] }),
    ).not.toBe(viewKeyOf(base))
  })

  it('is canonical: an untrimmed q is the same view', () => {
    expect(viewKeyOf({ ...base, q: ' acme ' })).toBe(viewKeyOf(base))
  })
})

describe('toggleRow', () => {
  it('selects and deselects one row, keeping its snapshot', () => {
    const once = toggleRow(start(), 'b', PAGE_1)
    expect(ids(once)).toEqual(['b'])
    expect(once.rows.get('b')).toEqual({ id: 'b' })
    expect(ids(toggleRow(once, 'b', PAGE_1))).toEqual([])
  })

  it('selects a range downwards and upwards (shift+click)', () => {
    const down = toggleRow(toggleRow(start(), 'b', PAGE_1), 'd', PAGE_1, { range: true })
    expect(ids(down).sort()).toEqual(['b', 'c', 'd'])

    const up = toggleRow(toggleRow(start(), 'e', PAGE_1), 'b', PAGE_1, { range: true })
    expect(ids(up).sort()).toEqual(['b', 'c', 'd', 'e'])
  })

  it("applies the clicked row's NEW state to the range: shift-clicking a selected row deselects", () => {
    let state = selectPage(start(), PAGE_1) // a–e selected
    state = toggleRow(state, 'a', PAGE_1) // deselect a: anchor = a
    state = toggleRow(state, 'd', PAGE_1, { range: true }) // d is selected → deselect a..d
    expect(ids(state)).toEqual(['e'])
  })

  it('moves the anchor to the last clicked row', () => {
    let state = toggleRow(start(), 'a', PAGE_1)
    state = toggleRow(state, 'c', PAGE_1, { range: true }) // a..c
    state = toggleRow(state, 'e', PAGE_1, { range: true }) // c is the anchor now: c..e
    expect(ids(state).sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('resets the anchor on a page change: a range click on another page is a plain toggle', () => {
    let state = toggleRow(start(), 'a', PAGE_1)
    state = toggleRow(state, 'h', PAGE_2, { range: true })
    expect(ids(state).sort()).toEqual(['a', 'h'])
    // …and that click becomes the anchor on page 2.
    state = toggleRow(state, 'j', PAGE_2, { range: true })
    expect(ids(state).sort()).toEqual(['a', 'h', 'i', 'j'])
  })

  it('can deselect a row from another page, but not select one it has no row for', () => {
    const state = toggleRow(start(), 'a', PAGE_1)
    expect(ids(toggleRow(state, 'a', PAGE_2))).toEqual([])
    expect(toggleRow(state, 'zzz', PAGE_2)).toBe(state)
  })
})

describe('page and bulk operations', () => {
  it('selectPage / clearPage only touch the current page', () => {
    const state = selectPage(toggleRow(start(), 'f', PAGE_2), PAGE_1)
    expect(ids(state).sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(ids(clearPage(state, PAGE_1))).toEqual(['f'])
  })

  it('remove drops the given ids and ignores unknown ones', () => {
    const state = selectPage(start(), PAGE_1)
    expect(ids(removeIds(state, ['b', 'd', 'zzz']))).toEqual(['a', 'c', 'e'])
    expect(removeIds(state, ['zzz'])).toBe(state)
  })

  it('pageKeyOf separates pages and page sizes', () => {
    expect(pageKeyOf({ page: 2, pageSize: 50 })).not.toBe(pageKeyOf({ page: 2, pageSize: 25 }))
  })
})

describe('pageSelectionState (the header checkbox)', () => {
  const on = (selected: string[]) => (id: string) => selected.includes(id)
  it.each([
    [[], 'none'],
    [['a'], 'some'],
    [['a', 'b', 'c'], 'all'],
    [['a', 'b', 'c', 'zzz'], 'all'],
  ] as const)('%j of a, b, c → %s', (selected, expected) => {
    expect(pageSelectionState(['a', 'b', 'c'], on([...selected]))).toBe(expected)
  })

  it('is none for an empty page', () => {
    expect(pageSelectionState([], () => true)).toBe('none')
  })
})
