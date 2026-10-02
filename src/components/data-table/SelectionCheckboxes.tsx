import type { MouseEvent } from 'react'
import { Checkbox } from '../checkbox'
import { useDataTableContext } from './context'
import { pageSelectionState } from './selection'

/** "Orders" → "order": the default row noun. Pass getRowLabel for anything irregular. */
const singular = (label: string) => label.toLowerCase().replace(/s$/, '')

/** Header: checked when the whole page is selected, mixed when part of it is. */
export function SelectPageCheckbox() {
  const { table, label } = useDataTableContext('Grid')
  const { selection } = table
  const state = pageSelectionState(selection.pageIds, selection.isSelected)

  return (
    <Checkbox
      aria-label={`Select all ${label.toLowerCase()} on this page`}
      checked={state === 'all'}
      indeterminate={state === 'some'}
      disabled={selection.pageIds.length === 0}
      onChange={() => (state === 'all' ? selection.clearPage() : selection.selectPage())}
    />
  )
}

/** Stops shift+click from also selecting the text between the two rows. */
const keepTextSelection = (event: MouseEvent) => {
  if (event.shiftKey) event.preventDefault()
}

export function SelectRowCheckbox({ id }: { id: string }) {
  const { table, label } = useDataTableContext('Grid')
  const { selection, getRowLabel } = table
  const row = table.rows.find((candidate) => candidate.id === id)?.original
  const name = (row !== undefined && getRowLabel?.(row)) || `${singular(label)} ${id}`

  return (
    <Checkbox
      aria-label={`Select ${name}`}
      checked={selection.isSelected(id)}
      // Rows from the previous view (a placeholder) can't be selected into the new one.
      disabled={!selection.pageIds.includes(id)}
      // onClick, not onChange: only the click carries shiftKey (also Shift+Space).
      onClick={(event) => selection.toggle(id, { range: event.shiftKey })}
      onChange={() => {}}
      onMouseDown={keepTextSelection}
    />
  )
}
