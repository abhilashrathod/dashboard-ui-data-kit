import { describe, expect, it } from 'vitest'
import {
  effectiveActiveCell,
  INITIAL_ACTIVE,
  listKeyOf,
  rekeyActiveCell,
  type StoredActiveCell,
} from '../activeCell'
import { HEADER_ROW } from '../gridNav'

const page1 = listKeyOf('view-a', 1, 50)
const stored = (row: number, col: number, listKey = page1): StoredActiveCell => ({
  pos: { row, col },
  listKey,
})

describe('rekeyActiveCell', () => {
  it('keeps the position (same object) when the list key is unchanged: a refetch', () => {
    const state = stored(12, 3)
    expect(rekeyActiveCell(state, page1)).toBe(state)
  })

  it.each([
    ['page change', listKeyOf('view-a', 2, 50)],
    ['page size change', listKeyOf('view-a', 1, 100)],
    ['view change (sort, filters, q)', listKeyOf('view-b', 1, 50)],
  ])('%s: row 0, column kept', (_, next) => {
    expect(rekeyActiveCell(stored(12, 3), next)).toEqual(stored(0, 3, next))
  })

  it('stays on the header row across a view change (a sort made from the header)', () => {
    const next = listKeyOf('view-b', 1, 50)
    expect(rekeyActiveCell(stored(HEADER_ROW, 6), next)).toEqual(stored(HEADER_ROW, 6, next))
  })
})

describe('effectiveActiveCell', () => {
  it('starts at the first data cell', () => {
    expect(
      effectiveActiveCell({ pos: INITIAL_ACTIVE, listKey: page1 }, { rowCount: 50, colCount: 8 }),
    ).toEqual({ row: 0, col: 0 })
  })

  it('is the header when there are no rows', () => {
    expect(
      effectiveActiveCell({ pos: INITIAL_ACTIVE, listKey: page1 }, { rowCount: 0, colCount: 8 }),
    ).toEqual({ row: HEADER_ROW, col: 0 })
  })

  it('clamps the row to a refetch with fewer rows', () => {
    expect(effectiveActiveCell(stored(45, 2), { rowCount: 30, colCount: 8 })).toEqual({
      row: 29,
      col: 2,
    })
  })

  it('clamps the column when columns are hidden', () => {
    expect(effectiveActiveCell(stored(4, 7), { rowCount: 50, colCount: 6 })).toEqual({
      row: 4,
      col: 5,
    })
  })
})
