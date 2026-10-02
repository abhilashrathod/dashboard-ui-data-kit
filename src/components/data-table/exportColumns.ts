import type { RowData, Table } from '@tanstack/react-table'
import type { CsvColumn } from '@/lib/csv'
import type { DataTableFeatures } from './columns'

/**
 * The CSV columns for what's on screen: visible leaf columns in display order,
 * minus `meta.csv === false`. Header = meta.label; value = meta.csv when it's
 * a function, else the column's raw accessor value (the data, not the
 * formatted cell: spreadsheets need 39.98, not "$39.98"). A column with
 * neither (a display-only column) is left out.
 */
export function buildCsvColumns<TData extends RowData>(
  instance: Pick<Table<DataTableFeatures, TData>, 'getVisibleLeafColumns'>,
): CsvColumn<TData>[] {
  return instance.getVisibleLeafColumns().flatMap((column): CsvColumn<TData>[] => {
    const meta = column.columnDef.meta
    if (meta?.csv === false) return []
    const header = meta?.label ?? column.id
    if (typeof meta?.csv === 'function') return [{ header, value: meta.csv }]
    const accessor = column.accessorFn
    if (!accessor) return []
    return [{ header, value: (row) => accessor(row, 0) }]
  })
}

/**
 * The rows "Export selected" writes. Selected rows on the current page come
 * first, in the page's order (the current sort); selected rows from other
 * pages follow, in the order they were selected. Their order across pages
 * isn't known without refetching them, so this doesn't pretend to sort them.
 */
export function selectedRowsForExport<TData>(
  page: readonly { id: string; original: TData }[],
  selection: { ids: readonly string[]; rows: readonly TData[] },
): TData[] {
  const selected = new Set(selection.ids)
  const onPage = page.filter((row) => selected.has(row.id))
  const pageIds = new Set(onPage.map((row) => row.id))
  const elsewhere = selection.rows.filter((_, index) => !pageIds.has(selection.ids[index]!))
  return [...onPage.map((row) => row.original), ...elsewhere]
}
