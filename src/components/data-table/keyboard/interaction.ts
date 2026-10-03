import { clampPos, HEADER_ROW, type Pos } from './gridNav'
import type { CellKind } from './focusTarget'

/*
 * Interaction mode for composite cells (WAI-ARIA APG grid pattern, "Keyboard
 * Interaction: Editing and Navigating Inside a Cell"). Pure, like gridNav.
 *
 * A composite cell holds several controls (the Customer cell: a name button
 * and a copy button). Normally the cell itself is focused and the arrows move
 * between cells. Enter or F2 switches to interaction mode: focus goes to the
 * first control, Tab / Shift+Tab cycle among the cell's controls (wrapping),
 * and every other key belongs to the focused control. Escape or F2 switches
 * back, with focus on the cell.
 */

export type InteractionAction =
  /** Enter interaction mode: focus the cell's first control. */
  | 'enter'
  /** Leave it: focus the cell. */
  | 'exit'
  /** Tab / Shift+Tab: the next / previous control in the cell, wrapping. */
  | 'next'
  | 'prev'
  /** Interacting: the key belongs to the focused control; the grid ignores it. */
  | 'pass'

export type InteractionKeyEvent = Pick<
  KeyboardEvent,
  'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
>

/**
 * What a key does to interaction mode, or null when it's not an
 * interaction-mode key (the grid's normal handling applies).
 *
 * @param interacting interaction mode is on for the cell the key came from
 * @param kind the cell's kind
 * @param onCell the key came from the cell itself, not a control inside it
 * @param row the cell's row (the header, -1, has no composite cells)
 */
export function interactionKey(
  event: InteractionKeyEvent,
  {
    interacting,
    kind,
    onCell,
    row,
  }: { interacting: boolean; kind: CellKind; onCell: boolean; row: number },
): InteractionAction | null {
  const modified = event.altKey || event.ctrlKey || event.metaKey
  if (interacting) {
    if (modified) return 'pass'
    if (event.key === 'Escape' || event.key === 'F2') return 'exit'
    if (event.key === 'Tab') return event.shiftKey ? 'prev' : 'next'
    return 'pass'
  }
  if (kind !== 'composite' || !onCell || row === HEADER_ROW || modified || event.shiftKey) {
    return null
  }
  return event.key === 'Enter' || event.key === 'F2' ? 'enter' : null
}

/** Tab cycling inside a cell: the index after `index` among `count`, wrapping both ways. */
export function cycleIndex(index: number, count: number, direction: 'next' | 'prev'): number {
  if (count <= 0) return -1
  if (index < 0) return direction === 'next' ? 0 : count - 1
  return (index + (direction === 'next' ? 1 : -1) + count) % count
}

/**
 * Interaction mode after a click or focus lands at `target` in the grid.
 * Landing on a control inside a composite cell turns it on (the mouse went
 * straight to the control, so Tab should cycle from there); landing anywhere
 * else, including the same cell's own padding, turns it off: "clicking
 * elsewhere exits".
 */
export function interactingAfterPointer(target: { kind: CellKind; onControl: boolean }): boolean {
  return target.kind === 'composite' && target.onControl
}

/**
 * Where focus returns when an overlay opened from the grid closes (the order
 * drawer, the keyboard help, a confirm dialog). There's no trigger button to
 * return to, so the grid decides:
 *  - the row the overlay was about is still on the page: that row, in the
 *    active column (it may have moved: a status change refetched and re-sorted);
 *  - it isn't (filtered out, moved to another page): the active cell, clamped
 *    to the rows that are there now.
 */
export function resolveFocusReturn({
  rowId,
  rowIds,
  active,
  colCount,
}: {
  rowId?: string
  rowIds: readonly string[]
  active: Pos
  colCount: number
}): Pos {
  const dims = { rowCount: rowIds.length, colCount }
  const index = rowId === undefined ? -1 : rowIds.indexOf(rowId)
  return clampPos(index === -1 ? active : { row: index, col: active.col }, dims)
}
