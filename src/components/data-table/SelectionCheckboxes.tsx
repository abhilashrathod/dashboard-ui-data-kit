import type { RowData } from '@tanstack/react-table'
import type { MouseEvent } from 'react'
import { Checkbox } from '../checkbox'
import { useDataTableCellContext } from './context'
import { useFocusTargetProps } from './keyboard/focusTarget'
import { singularNoun } from './model'
import { pageSelectionState } from './selection'

/*
 * Unavailable checkboxes (no rows yet, or a placeholder page) use
 * aria-disabled, not disabled: a disabled control can't take focus, and in the
 * grid's roving tabindex the active cell's checkbox may be the grid's only Tab
 * stop. Their clicks (and Space) are ignored instead; the checked state is
 * controlled, so React puts the box back. (No preventDefault: on a controlled
 * checkbox it fights React's restore and leaves the box visibly toggled.)
 */

/** Header: checked when the whole page is selected, mixed when part of it is. */
export function SelectPageCheckbox() {
  const { selection, label } = useDataTableCellContext('SelectPageCheckbox')
  const state = pageSelectionState(selection.pageIds, selection.isSelected)
  const unavailable = selection.pageIds.length === 0

  return (
    <Checkbox
      {...useFocusTargetProps()}
      aria-label={`Select all ${label.toLowerCase()} on this page`}
      checked={state === 'all'}
      indeterminate={state === 'some'}
      aria-disabled={unavailable || undefined}
      onChange={() => {
        if (unavailable) return
        if (state === 'all') selection.clearPage()
        else selection.selectPage()
      }}
    />
  )
}

/** Stops shift+click from also selecting the text between the two rows. */
const keepTextSelection = (event: MouseEvent) => {
  if (event.shiftKey) event.preventDefault()
}

export function SelectRowCheckbox({ id, row }: { id: string; row: RowData }) {
  const { selection, label, getRowLabel } = useDataTableCellContext('SelectRowCheckbox')
  const name = getRowLabel?.(row) || `${singularNoun(label)} ${id}`
  // Rows from the previous view (a placeholder) can't be selected into the new one.
  const unavailable = !selection.pageIds.includes(id)

  return (
    <Checkbox
      {...useFocusTargetProps()}
      aria-label={`Select ${name}`}
      checked={selection.isSelected(id)}
      aria-disabled={unavailable || undefined}
      // onClick, not onChange: only the click carries shiftKey (also Shift+Space).
      onClick={(event) => {
        if (!unavailable) selection.toggle(id, { range: event.shiftKey })
      }}
      onChange={() => {}}
      onMouseDown={keepTextSelection}
    />
  )
}
