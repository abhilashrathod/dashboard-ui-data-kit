import type { RowData } from '@tanstack/react-table'
import { createContext, use } from 'react'
import type { DataTableModel } from './useDataTable'

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
