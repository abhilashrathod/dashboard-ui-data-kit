import type { RowData } from '@tanstack/react-table'
import { createElement } from 'react'
import type { DataColumnDef } from './columns'
import { SelectPageCheckbox, SelectRowCheckbox } from './SelectionCheckboxes'

export const SELECTION_COLUMN_ID = 'select'

/**
 * Inserted as the first column by useDataTable({ selectable: true }). Not
 * hideable, not sortable (no sortField), not exported to CSV.
 */
export const selectionColumn: DataColumnDef<RowData> = {
  id: SELECTION_COLUMN_ID,
  header: () => createElement(SelectPageCheckbox),
  cell: ({ row }) => createElement(SelectRowCheckbox, { id: row.id, row: row.original }),
  meta: {
    label: 'Select',
    hideable: false,
    csv: false,
    width: { min: 64, ideal: 64 },
    // The checkbox takes focus itself, in the header and in every row.
    cellKind: 'widget',
    utility: true,
  },
}
