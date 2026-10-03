import { describe, expect, it } from 'vitest'
import type { CellKind } from '../focusTarget'
import {
  cycleIndex,
  interactingAfterPointer,
  interactionKey,
  resolveFocusReturn,
  type InteractionAction,
  type InteractionKeyEvent,
} from '../interaction'

const key = (
  k: string,
  mods: Partial<Omit<InteractionKeyEvent, 'key'>> = {},
): InteractionKeyEvent => ({
  key: k,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...mods,
})

type Ctx = { interacting: boolean; kind: CellKind; onCell: boolean; row: number }
const onComposite: Ctx = { interacting: false, kind: 'composite', onCell: true, row: 3 }
const inside: Ctx = { interacting: true, kind: 'composite', onCell: false, row: 3 }

describe('interactionKey', () => {
  it.each<[string, InteractionKeyEvent, Ctx, InteractionAction | null]>([
    // Entering: Enter or F2 on a composite cell itself
    ['Enter on a composite cell', key('Enter'), onComposite, 'enter'],
    ['F2 on a composite cell', key('F2'), onComposite, 'enter'],
    [
      'Enter on a text cell: not ours (opens the row)',
      key('Enter'),
      { ...onComposite, kind: 'text' },
      null,
    ],
    [
      'Enter on a widget cell: the widget’s',
      key('Enter'),
      { ...onComposite, kind: 'widget' },
      null,
    ],
    ['Enter from a control, not the cell', key('Enter'), { ...onComposite, onCell: false }, null],
    ['Enter on the header row', key('Enter'), { ...onComposite, row: -1 }, null],
    ['Ctrl+Enter', key('Enter', { ctrlKey: true }), onComposite, null],
    ['Shift+Enter', key('Enter', { shiftKey: true }), onComposite, null],
    [
      'Escape when not interacting: not ours (the bulk bar may use it)',
      key('Escape'),
      onComposite,
      null,
    ],
    ['an arrow when not interacting: navigation', key('ArrowDown'), onComposite, null],
    ['Space when not interacting: selection', key(' '), onComposite, null],
    // While interacting
    ['Escape exits', key('Escape'), inside, 'exit'],
    ['F2 toggles back out', key('F2'), inside, 'exit'],
    ['Tab: next control', key('Tab'), inside, 'next'],
    ['Shift+Tab: previous control', key('Tab', { shiftKey: true }), inside, 'prev'],
    ['ArrowDown belongs to the control', key('ArrowDown'), inside, 'pass'],
    ['ArrowLeft belongs to the control', key('ArrowLeft'), inside, 'pass'],
    ['Home belongs to the control', key('Home'), inside, 'pass'],
    ['PageDown belongs to the control', key('PageDown'), inside, 'pass'],
    ['Space belongs to the control (no row selection)', key(' '), inside, 'pass'],
    ['Enter belongs to the control (presses it)', key('Enter'), inside, 'pass'],
    ['Ctrl+A belongs to the control', key('a', { ctrlKey: true }), inside, 'pass'],
    ['Ctrl+End belongs to the control', key('End', { ctrlKey: true }), inside, 'pass'],
    ['? belongs to the control', key('?', { shiftKey: true }), inside, 'pass'],
    [
      'Escape from the cell itself while interacting',
      key('Escape'),
      { ...inside, onCell: true },
      'exit',
    ],
  ])('%s', (_, event, ctx, expected) => {
    expect(interactionKey(event, ctx)).toBe(expected)
  })
})

describe('cycleIndex: Tab within the cell wraps both ways', () => {
  it.each<[number, number, 'next' | 'prev', number]>([
    [0, 2, 'next', 1],
    [1, 2, 'next', 0], // wraps forward
    [0, 2, 'prev', 1], // wraps backward
    [1, 2, 'prev', 0],
    [0, 1, 'next', 0], // one control: stays
    [0, 1, 'prev', 0],
    [2, 3, 'next', 0],
    [-1, 3, 'next', 0], // focus on none of them: start at the first
    [-1, 3, 'prev', 2], // …or the last
    [0, 0, 'next', -1], // no controls
  ])('index %i of %i, %s → %i', (index, count, direction, expected) => {
    expect(cycleIndex(index, count, direction)).toBe(expected)
  })
})

describe('interactingAfterPointer: clicking elsewhere exits', () => {
  it.each<[CellKind, boolean, boolean]>([
    ['composite', true, true], // a click on the name button: interacting
    ['composite', false, false], // the cell's own padding: not
    ['text', false, false],
    ['widget', true, false], // a widget's control isn't interaction mode
  ])('%s cell, on a control: %s → %s', (kind, onControl, expected) => {
    expect(interactingAfterPointer({ kind, onControl })).toBe(expected)
  })
})

describe('resolveFocusReturn: after the drawer closes', () => {
  const rowIds = ['A', 'B', 'C', 'D']
  const active = { row: 1, col: 6 }

  it('the row is still on the page, where it was: that cell', () => {
    expect(resolveFocusReturn({ rowId: 'B', rowIds, active, colCount: 9 })).toEqual({
      row: 1,
      col: 6,
    })
  })

  it('the row moved (a status change re-sorted the page): follows it, same column', () => {
    expect(resolveFocusReturn({ rowId: 'D', rowIds, active, colCount: 9 })).toEqual({
      row: 3,
      col: 6,
    })
  })

  it('the row is gone: the active cell, as it is', () => {
    expect(resolveFocusReturn({ rowId: 'Z', rowIds, active, colCount: 9 })).toEqual({
      row: 1,
      col: 6,
    })
  })

  it('the row is gone and the page is shorter: the active cell, clamped', () => {
    const shorter = resolveFocusReturn({
      rowId: 'Z',
      rowIds: ['A'],
      active: { row: 3, col: 6 },
      colCount: 9,
    })
    expect(shorter).toEqual({ row: 0, col: 6 })
  })

  it('no rows left at all: the header', () => {
    expect(resolveFocusReturn({ rowId: 'B', rowIds: [], active, colCount: 9 })).toEqual({
      row: -1,
      col: 6,
    })
  })

  it('no row id (the keyboard help): the active cell, clamped to fewer columns', () => {
    expect(resolveFocusReturn({ rowIds, active, colCount: 4 })).toEqual({ row: 1, col: 3 })
  })
})
