import type { RowData } from '@tanstack/react-table'
import { createContext, use } from 'react'
import type { DataTableModel } from './useDataTable'
import type { DataTableSelection } from './useSelection'

export interface DataTableContextValue {
  /** The parts are row-type agnostic; cells get their row type from the column defs. */
  table: DataTableModel<RowData>
  /** The table's accessible name ("Orders"). */
  label: string
  /** A <DataTable.BulkBar> is among the root's children (the grid leaves room for it). */
  hasBulkBar: boolean
}

export const DataTableContext = createContext<DataTableContextValue | null>(null)

export function useDataTableContext(part: string): DataTableContextValue {
  const context = use(DataTableContext)
  if (!context) throw new Error(`<DataTable.${part}> must be used inside <DataTable>.`)
  return context
}

/**
 * What cell renderers read (the selection checkboxes). Narrower than the table
 * context on purpose: its value only changes with the selection or the page,
 * not on every table render, so moving the active cell doesn't re-render a
 * checkbox in every row (context consumers skip the rows' memo).
 */
export interface DataTableCellContextValue {
  selection: DataTableSelection<RowData>
  label: string
  getRowLabel?: (row: RowData) => string
}

export const DataTableCellContext = createContext<DataTableCellContextValue | null>(null)

export function useDataTableCellContext(part: string): DataTableCellContextValue {
  const context = use(DataTableCellContext)
  if (!context) throw new Error(`${part} must be rendered by <DataTable.Grid>.`)
  return context
}
