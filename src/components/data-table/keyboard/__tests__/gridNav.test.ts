import { describe, expect, it } from 'vitest'
import {
  clampPos,
  gridNav,
  HEADER_ROW,
  toNavKey,
  type Dims,
  type NavKey,
  type NavKeyEvent,
  type Pos,
} from '../gridNav'

/*
 * gridNav, table-driven. The grid: 20 data rows × 5 columns, PageUp/Down step
 * 10, so the header is row -1, the last row 19, the last column 4.
 */
const D: Dims = { rowCount: 20, colCount: 5, pageStep: 10 }
const H = HEADER_ROW

type Case = [from: string, at: Pos, key: NavKey, to: Pos]
const p = (row: number, col: number): Pos => ({ row, col })

// Every key from the four data corners, the edges and the middle.
const navCases: Case[] = [
  // Top-left data cell (0,0)
  ['top-left', p(0, 0), 'up', p(H, 0)], // into the header
  ['top-left', p(0, 0), 'down', p(1, 0)],
  ['top-left', p(0, 0), 'left', p(0, 0)], // clamped, no wrap
  ['top-left', p(0, 0), 'right', p(0, 1)],
  ['top-left', p(0, 0), 'rowStart', p(0, 0)],
  ['top-left', p(0, 0), 'rowEnd', p(0, 4)],
  ['top-left', p(0, 0), 'gridStart', p(0, 0)],
  ['top-left', p(0, 0), 'gridEnd', p(19, 4)],
  ['top-left', p(0, 0), 'pageUp', p(0, 0)], // never into the header
  ['top-left', p(0, 0), 'pageDown', p(10, 0)],
  // Top-right data cell (0,4)
  ['top-right', p(0, 4), 'up', p(H, 4)],
  ['top-right', p(0, 4), 'down', p(1, 4)],
  ['top-right', p(0, 4), 'left', p(0, 3)],
  ['top-right', p(0, 4), 'right', p(0, 4)], // clamped, no wrap to the next row
  ['top-right', p(0, 4), 'rowStart', p(0, 0)],
  ['top-right', p(0, 4), 'rowEnd', p(0, 4)],
  ['top-right', p(0, 4), 'gridStart', p(0, 0)],
  ['top-right', p(0, 4), 'gridEnd', p(19, 4)],
  ['top-right', p(0, 4), 'pageUp', p(0, 4)],
  ['top-right', p(0, 4), 'pageDown', p(10, 4)],
  // Bottom-left (19,0)
  ['bottom-left', p(19, 0), 'up', p(18, 0)],
  ['bottom-left', p(19, 0), 'down', p(19, 0)], // clamped
  ['bottom-left', p(19, 0), 'left', p(19, 0)],
  ['bottom-left', p(19, 0), 'right', p(19, 1)],
  ['bottom-left', p(19, 0), 'rowStart', p(19, 0)],
  ['bottom-left', p(19, 0), 'rowEnd', p(19, 4)],
  ['bottom-left', p(19, 0), 'gridStart', p(0, 0)],
  ['bottom-left', p(19, 0), 'gridEnd', p(19, 4)],
  ['bottom-left', p(19, 0), 'pageUp', p(9, 0)],
  ['bottom-left', p(19, 0), 'pageDown', p(19, 0)],
  // Bottom-right (19,4)
  ['bottom-right', p(19, 4), 'up', p(18, 4)],
  ['bottom-right', p(19, 4), 'down', p(19, 4)],
  ['bottom-right', p(19, 4), 'left', p(19, 3)],
  ['bottom-right', p(19, 4), 'right', p(19, 4)],
  ['bottom-right', p(19, 4), 'rowStart', p(19, 0)],
  ['bottom-right', p(19, 4), 'rowEnd', p(19, 4)],
  ['bottom-right', p(19, 4), 'gridStart', p(0, 0)],
  ['bottom-right', p(19, 4), 'gridEnd', p(19, 4)],
  ['bottom-right', p(19, 4), 'pageUp', p(9, 4)],
  ['bottom-right', p(19, 4), 'pageDown', p(19, 4)],
  // Middle (7,2)
  ['middle', p(7, 2), 'up', p(6, 2)],
  ['middle', p(7, 2), 'down', p(8, 2)],
  ['middle', p(7, 2), 'left', p(7, 1)],
  ['middle', p(7, 2), 'right', p(7, 3)],
  ['middle', p(7, 2), 'rowStart', p(7, 0)],
  ['middle', p(7, 2), 'rowEnd', p(7, 4)],
  ['middle', p(7, 2), 'gridStart', p(0, 0)],
  ['middle', p(7, 2), 'gridEnd', p(19, 4)],
  ['middle', p(7, 2), 'pageUp', p(0, 2)], // 7 - 10: stops at row 0
  ['middle', p(7, 2), 'pageDown', p(17, 2)],
  // Left edge, mid-grid (12,0) and right edge (12,4)
  ['left edge', p(12, 0), 'left', p(12, 0)],
  ['left edge', p(12, 0), 'pageUp', p(2, 0)],
  ['left edge', p(12, 0), 'pageDown', p(19, 0)], // 12 + 10 > 19: clamped to the last row
  ['right edge', p(12, 4), 'right', p(12, 4)],
  ['right edge', p(12, 4), 'up', p(11, 4)],
  // The header row (-1)
  ['header', p(H, 2), 'up', p(H, 2)], // nothing above the header
  ['header', p(H, 2), 'down', p(0, 2)],
  ['header', p(H, 2), 'left', p(H, 1)],
  ['header', p(H, 2), 'right', p(H, 3)],
  ['header', p(H, 0), 'left', p(H, 0)],
  ['header', p(H, 4), 'right', p(H, 4)],
  ['header', p(H, 2), 'rowStart', p(H, 0)],
  ['header', p(H, 2), 'rowEnd', p(H, 4)],
  ['header', p(H, 2), 'gridStart', p(0, 0)], // the first DATA row, not the header
  ['header', p(H, 2), 'gridEnd', p(19, 4)],
  ['header', p(H, 2), 'pageUp', p(H, 2)],
  ['header', p(H, 2), 'pageDown', p(9, 2)], // -1 + 10
]

describe('gridNav: every key from the corners, edges, middle and header', () => {
  it.each(navCases)('%s %o + %s → %o', (_, at, key, to) => {
    expect(gridNav(at, key, D)).toEqual(to)
  })
})

// pageStep larger than what's left, and other dimension edge cases.
const dimsCases: [name: string, at: Pos, key: NavKey, dims: Dims, to: Pos][] = [
  [
    'pageDown past the end (step 50, 20 rows)',
    p(3, 1),
    'pageDown',
    { ...D, pageStep: 50 },
    p(19, 1),
  ],
  ['pageUp past the start (step 50)', p(15, 1), 'pageUp', { ...D, pageStep: 50 }, p(0, 1)],
  ['pageDown from the header, step 50', p(H, 1), 'pageDown', { ...D, pageStep: 50 }, p(19, 1)],
  ['pageDown with step 1 = down', p(4, 1), 'pageDown', { ...D, pageStep: 1 }, p(5, 1)],
  ['one row: down stays', p(0, 0), 'down', { ...D, rowCount: 1 }, p(0, 0)],
  ['one row: up → header', p(0, 0), 'up', { ...D, rowCount: 1 }, p(H, 0)],
  ['one row: pageDown stays', p(0, 0), 'pageDown', { ...D, rowCount: 1 }, p(0, 0)],
  ['one column: right stays', p(3, 0), 'right', { ...D, colCount: 1 }, p(3, 0)],
  ['one column: rowEnd = col 0', p(3, 0), 'rowEnd', { ...D, colCount: 1 }, p(3, 0)],
  // rowCount 0: only the header exists.
  ['no rows: down stays on the header', p(H, 1), 'down', { ...D, rowCount: 0 }, p(H, 1)],
  ['no rows: up stays on the header', p(H, 1), 'up', { ...D, rowCount: 0 }, p(H, 1)],
  ['no rows: pageDown stays', p(H, 1), 'pageDown', { ...D, rowCount: 0 }, p(H, 1)],
  ['no rows: gridStart → header, col 0', p(H, 3), 'gridStart', { ...D, rowCount: 0 }, p(H, 0)],
  ['no rows: gridEnd → header, last col', p(H, 1), 'gridEnd', { ...D, rowCount: 0 }, p(H, 4)],
  ['no rows: right moves along the header', p(H, 1), 'right', { ...D, rowCount: 0 }, p(H, 2)],
  [
    'no rows: a stale data position lands on the header',
    p(5, 1),
    'left',
    { ...D, rowCount: 0 },
    p(H, 0),
  ],
  // An out-of-range starting point (rows shrank under the cursor) is clamped first.
  ['stale row 40 of 20, up', p(40, 2), 'up', D, p(18, 2)],
  ['stale col 9 of 5, left', p(3, 9), 'left', D, p(3, 3)],
]

describe('gridNav: clamping, rowCount 0, large page steps', () => {
  it.each(dimsCases)('%s', (_, at, key, dims, to) => {
    expect(gridNav(at, key, dims)).toEqual(to)
  })
})

describe('clampPos', () => {
  it.each<[Pos, Pick<Dims, 'rowCount' | 'colCount'>, Pos]>([
    [p(5, 2), { rowCount: 20, colCount: 5 }, p(5, 2)],
    [p(25, 2), { rowCount: 20, colCount: 5 }, p(19, 2)],
    [p(5, 7), { rowCount: 20, colCount: 5 }, p(5, 4)],
    [p(-3, -1), { rowCount: 20, colCount: 5 }, p(H, 0)],
    [p(5, 2), { rowCount: 0, colCount: 5 }, p(H, 2)],
    [p(H, 2), { rowCount: 20, colCount: 5 }, p(H, 2)],
  ])('%o in %o → %o', (at, dims, to) => {
    expect(clampPos(at, dims)).toEqual(to)
  })
})

const key = (key: string, mods: Partial<Omit<NavKeyEvent, 'key'>> = {}): NavKeyEvent => ({
  key,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...mods,
})

describe('toNavKey', () => {
  it.each<[string, NavKeyEvent, NavKey | null]>([
    // Plain keys
    ['ArrowUp', key('ArrowUp'), 'up'],
    ['ArrowDown', key('ArrowDown'), 'down'],
    ['ArrowLeft', key('ArrowLeft'), 'left'],
    ['ArrowRight', key('ArrowRight'), 'right'],
    ['Home', key('Home'), 'rowStart'],
    ['End', key('End'), 'rowEnd'],
    ['PageUp', key('PageUp'), 'pageUp'],
    ['PageDown', key('PageDown'), 'pageDown'],
    // Ctrl (Windows / Linux) and Cmd (Mac)
    ['Ctrl+Home', key('Home', { ctrlKey: true }), 'gridStart'],
    ['Ctrl+End', key('End', { ctrlKey: true }), 'gridEnd'],
    ['Cmd+Home', key('Home', { metaKey: true }), 'gridStart'],
    ['Cmd+End', key('End', { metaKey: true }), 'gridEnd'],
    ['Cmd+ArrowUp (Mac alias)', key('ArrowUp', { metaKey: true }), 'gridStart'],
    ['Cmd+ArrowDown (Mac alias)', key('ArrowDown', { metaKey: true }), 'gridEnd'],
    // Combos that aren't ours
    ['Ctrl+ArrowUp (Mission Control)', key('ArrowUp', { ctrlKey: true }), null],
    ['Ctrl+ArrowDown', key('ArrowDown', { ctrlKey: true }), null],
    ['Ctrl+ArrowLeft (word jump)', key('ArrowLeft', { ctrlKey: true }), null],
    ['Cmd+ArrowLeft', key('ArrowLeft', { metaKey: true }), null],
    ['Ctrl+PageDown (next tab)', key('PageDown', { ctrlKey: true }), null],
    ['Cmd+PageUp', key('PageUp', { metaKey: true }), null],
    ['Ctrl+Cmd+Home', key('Home', { ctrlKey: true, metaKey: true }), null],
    // Alt: always ignored
    ['Alt+ArrowLeft (Back)', key('ArrowLeft', { altKey: true }), null],
    ['Alt+Home', key('Home', { altKey: true }), null],
    ['Alt+Cmd+ArrowUp', key('ArrowUp', { altKey: true, metaKey: true }), null],
    ['Ctrl+Alt+End', key('End', { altKey: true, ctrlKey: true }), null],
    // Shift: reserved (range extension), never navigation
    ['Shift+ArrowDown', key('ArrowDown', { shiftKey: true }), null],
    ['Shift+End', key('End', { shiftKey: true }), null],
    ['Ctrl+Shift+End', key('End', { ctrlKey: true, shiftKey: true }), null],
    // Non-navigation keys
    ['Space', key(' '), null],
    ['Enter', key('Enter'), null],
    ['Tab', key('Tab'), null],
    ['Escape', key('Escape'), null],
    ['a', key('a'), null],
    ['Ctrl+A', key('a', { ctrlKey: true }), null],
    ['F2', key('F2'), null],
  ])('%s', (_, event, expected) => {
    expect(toNavKey(event)).toBe(expected)
  })
})
