import { Children, isValidElement, useMemo, useRef, type ReactNode } from 'react'
import type { RowData } from '@tanstack/react-table'
import { Card } from '../card'
import { DataTableContext } from './context'
import { DataTableBulkBar } from './DataTableBulkBar'
import { DataTableColumnToggle } from './DataTableColumnToggle'
import { DataTableDensityToggle } from './DataTableDensityToggle'
import { DataTableExport } from './DataTableExport'
import { DataTableGrid } from './DataTableGrid'
import { DataTableKeyboardHelp } from './DataTableKeyboardHelp'
import { DataTablePagination } from './DataTablePagination'
import { DataTableSearch } from './DataTableSearch'
import { DataTableToolbar } from './DataTableToolbar'
import type { DataTableModel } from './useDataTable'

/**
 * The root's whole API. Rule 1 of docs/data-table.md: features are child
 * components, never boolean props, so this stays at three. A type-level test
 * (DataTable.test.tsx) fails if a prop is added.
 */
export interface DataTableProps<TData extends RowData> {
  /** From useDataTable. */
  table: DataTableModel<TData>
  /** Names the table and its region, e.g. "Orders". Also used in announcements and empty states. */
  'aria-label': string
  /** The parts: Toolbar, Grid, Pagination, in the order they should appear. */
  children: ReactNode
}

/**
 * A data table: provides the table to its parts and renders the card they sit
 * in. The card has no horizontal padding, so the grid bleeds to its edges;
 * each part pads itself.
 *
 *   <DataTable table={table} aria-label="Orders">
 *     <DataTable.Toolbar>
 *       <DataTable.Search />
 *       <DataTable.DensityToggle slot="end" />
 *     </DataTable.Toolbar>
 *     <DataTable.Grid />
 *     <DataTable.Pagination />
 *     <DataTable.BulkBar>{(selection) => <Actions selection={selection} />}</DataTable.BulkBar>
 *   </DataTable>
 */
export function DataTable<TData extends RowData>({
  table,
  'aria-label': label,
  children,
}: DataTableProps<TData>) {
  // Direct children only, like the toolbar's slot="end": the bar is a part of the table.
  const hasBulkBar = Children.toArray(children).some(
    (child) => isValidElement(child) && child.type === DataTableBulkBar,
  )
  const keyboardHelpRef = useRef<(() => void) | null>(null)
  const context = useMemo(
    // Erase the row type: the parts never touch row data, only the column defs do.
    () => ({
      table: table as unknown as DataTableModel<RowData>,
      label,
      hasBulkBar,
      keyboardHelpRef,
    }),
    [table, label, hasBulkBar],
  )
  return (
    <DataTableContext value={context}>
      <Card data-slot="data-table" className="gap-4 px-0 py-card">
        {children}
      </Card>
    </DataTableContext>
  )
}

DataTable.Toolbar = DataTableToolbar
DataTable.ColumnToggle = DataTableColumnToggle
DataTable.Export = DataTableExport
DataTable.BulkBar = DataTableBulkBar
DataTable.Search = DataTableSearch
DataTable.DensityToggle = DataTableDensityToggle
DataTable.Grid = DataTableGrid
DataTable.KeyboardHelp = DataTableKeyboardHelp
DataTable.Pagination = DataTablePagination
