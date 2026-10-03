import { createContext, use } from 'react'
import type { Pos } from './gridNav'

/*
 * Roving tabindex, the markup half. Exactly one element in the grid has
 * tabIndex 0: the active cell's focus target. Everything else focusable in the
 * grid has -1, so Tab enters the grid once and leaves it on the next press.
 *
 * Which element is the target depends on the column's `meta.cellKind`:
 *  - 'text' (default) and, until 5b, 'composite': the cell (<td>) itself.
 *  - 'widget': the ONE interactive element inside the cell (a checkbox, an
 *    action button). The cell has no tabIndex; the widget reads its own from
 *    FocusTargetContext through useFocusTargetProps().
 */

export type CellKind = 'text' | 'widget' | 'composite'

/** Data attributes the grid's delegated handlers read. */
export const CELL_ROW_ATTR = 'data-grid-row'
export const CELL_COL_ATTR = 'data-grid-col'
export const FOCUS_TARGET_ATTR = 'data-grid-focus-target'

/**
 * Props for a grid cell (<td> / <th>): its coordinates for the delegated
 * handlers, and its tabIndex when it is its own focus target. Pure, so the
 * memoized row can call it without a hook.
 */
export function gridCellProps({
  row,
  col,
  kind,
  active,
}: Pos & { kind: CellKind; active: boolean }) {
  return {
    [CELL_ROW_ATTR]: row,
    [CELL_COL_ATTR]: col,
    'data-cell-kind': kind,
    'aria-colindex': col + 1,
    tabIndex: kind === 'widget' ? undefined : active ? 0 : -1,
  }
}

/** The tabIndex a widget cell hands its control. null: not inside a grid cell. */
export const FocusTargetContext = createContext<0 | -1 | null>(null)

/**
 * Spread onto the single interactive element of a widget cell:
 *
 *   <Checkbox {...useFocusTargetProps()} … />
 *
 * Inside a grid: its roving tabIndex and the marker the grid focuses. Outside
 * one (the same component used elsewhere): nothing.
 */
export function useFocusTargetProps(): { tabIndex?: number; [FOCUS_TARGET_ATTR]?: '' } {
  const tabIndex = use(FocusTargetContext)
  return tabIndex === null ? {} : { tabIndex, [FOCUS_TARGET_ATTR]: '' }
}

/** The cell element at `pos` inside `grid`, if rendered. */
export function cellAt(grid: HTMLElement, pos: Pos): HTMLElement | null {
  return grid.querySelector<HTMLElement>(
    `[${CELL_ROW_ATTR}="${pos.row}"][${CELL_COL_ATTR}="${pos.col}"]`,
  )
}

/** The element that takes focus for the cell at `pos`: the widget's control, or the cell. */
export function focusTargetAt(grid: HTMLElement, pos: Pos): HTMLElement | null {
  const cell = cellAt(grid, pos)
  if (cell?.dataset.cellKind !== 'widget') return cell
  return cell.querySelector<HTMLElement>(`[${FOCUS_TARGET_ATTR}]`)
}

/** The grid position of the cell containing `element`, or null when it isn't in one. */
export function posOf(element: Element): { pos: Pos; cell: HTMLElement } | null {
  const cell = element.closest<HTMLElement>(`[${CELL_ROW_ATTR}]`)
  if (!cell) return null
  return {
    cell,
    pos: {
      row: Number(cell.getAttribute(CELL_ROW_ATTR)),
      col: Number(cell.getAttribute(CELL_COL_ATTR)),
    },
  }
}
