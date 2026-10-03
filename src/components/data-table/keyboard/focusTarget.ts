import { createContext, use } from 'react'
import type { Pos } from './gridNav'

/*
 * Roving tabindex, the markup half. Exactly one element in the grid has
 * tabIndex 0: the active cell's focus target. Everything else focusable in the
 * grid has -1, so Tab enters the grid once and leaves it on the next press.
 *
 * Which element is the target depends on the column's `meta.cellKind`:
 *  - 'text' (default): the cell (<td>) itself.
 *  - 'widget': the ONE interactive element inside the cell (a checkbox, an
 *    action button). The cell has no tabIndex; the widget reads its own from
 *    FocusTargetContext through useFocusTargetProps().
 *  - 'composite': the cell itself, like text. Its controls read their
 *    tabIndex from CellInteractiveContext through useCellInteractive(): -1
 *    normally, 0 while the cell is in interaction mode (interaction.ts).
 */

export type CellKind = 'text' | 'widget' | 'composite'

/** Data attributes the grid's delegated handlers read. */
export const CELL_ROW_ATTR = 'data-grid-row'
export const CELL_COL_ATTR = 'data-grid-col'
export const FOCUS_TARGET_ATTR = 'data-grid-focus-target'
/** Marks a control inside a composite cell (useCellInteractive). */
export const CELL_CONTROL_ATTR = 'data-grid-control'

/**
 * Props for a grid cell (<td> / <th>): its coordinates for the delegated
 * handlers, and its tabIndex when it is its own focus target. Pure, so the
 * memoized row can call it without a hook. Composite cells also point at the
 * grid's one "Press Enter to interact" description (`hintId`).
 */
export function gridCellProps({
  row,
  col,
  kind,
  active,
  interacting = false,
  hintId,
}: Pos & { kind: CellKind; active: boolean; interacting?: boolean; hintId?: string }) {
  return {
    [CELL_ROW_ATTR]: row,
    [CELL_COL_ATTR]: col,
    'data-cell-kind': kind,
    'data-interacting': interacting ? '' : undefined,
    'aria-colindex': col + 1,
    'aria-describedby': kind === 'composite' ? hintId : undefined,
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

/** The tabIndex a composite cell hands its controls: 0 only while interacting. null: not in a grid. */
export const CellInteractiveContext = createContext<0 | -1 | null>(null)

/**
 * Spread onto EVERY control inside a composite cell:
 *
 *   <button {...useCellInteractive()} onClick={…}>Filter</button>
 *
 * In a grid: tabIndex -1 (the cell is the Tab stop), 0 while the cell is in
 * interaction mode, plus the marker the grid uses to find the cell's controls
 * (Enter focuses the first; Tab cycles through them). Outside a grid: nothing.
 */
export function useCellInteractive(): { tabIndex?: number; [CELL_CONTROL_ATTR]?: '' } {
  const tabIndex = use(CellInteractiveContext)
  return tabIndex === null ? {} : { tabIndex, [CELL_CONTROL_ATTR]: '' }
}

/** The cell element at `pos` inside `grid`, if rendered. */
export function cellAt(grid: HTMLElement, pos: Pos): HTMLElement | null {
  return grid.querySelector<HTMLElement>(
    `[${CELL_ROW_ATTR}="${pos.row}"][${CELL_COL_ATTR}="${pos.col}"]`,
  )
}

/** A composite cell's controls, in DOM order, skipping disabled ones. */
export function cellControls(cell: HTMLElement): HTMLElement[] {
  return [...cell.querySelectorAll<HTMLElement>(`[${CELL_CONTROL_ATTR}]`)].filter(
    (control) => !control.matches(':disabled'),
  )
}

/**
 * The element that takes focus for the cell at `pos`: the widget's control,
 * the first control of a composite cell in interaction mode, or the cell.
 */
export function focusTargetAt(
  grid: HTMLElement,
  pos: Pos,
  { interacting = false }: { interacting?: boolean } = {},
): HTMLElement | null {
  const cell = cellAt(grid, pos)
  if (!cell) return null
  const kind = cell.dataset.cellKind
  if (kind === 'widget') return cell.querySelector<HTMLElement>(`[${FOCUS_TARGET_ATTR}]`)
  if (kind === 'composite' && interacting) return cellControls(cell)[0] ?? cell
  return cell
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
