import {
  columnVisibilityFeature,
  createColumnHelper as createTanstackColumnHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  type AccessorFn,
  type AccessorFnColumnDef,
  type AccessorKeyColumnDef,
  type CellData,
  type ColumnDef,
  type ColumnHelper,
  type DeepKeys,
  type DeepValue,
  type DisplayColumnDef,
  type IdentifiedColumnDef,
  type RowData,
  type TableFeatures,
} from '@tanstack/react-table'
import type { SortField } from '@/contracts'

/**
 * The TanStack features every DataTable registers (v9 makes them explicit).
 * Sorting and pagination are driven from the URL, visibility from the user's
 * stored preference. No client row models: the server sorts and pages (see
 * useDataTable). Selection is the kit's own model (selection.ts), not
 * rowSelectionFeature, because it keeps row snapshots across pages.
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
})
export type DataTableFeatures = typeof dataTableFeatures

/**
 * Column widths, turned into a CSS grid track: `minmax(min, ideal | 1fr)`.
 * `grow` makes the column take leftover space (1fr) instead of stopping at `ideal`.
 */
export interface DataColumnWidth {
  min: number
  ideal?: number
  grow?: boolean
}

/**
 * Everything the kit knows about a column, in one place. Headers, the toolbar,
 * filters and CSV export all read this; nothing is configured twice.
 */
/** What a column puts in a CSV cell. null / undefined → an empty field. */
export type CsvValue = string | number | null | undefined

/** `row` is typed as the table's row; `any` by default so ColumnLike can hold any column. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DataColumnMeta<TData = any> {
  /** Required. Header text, the column toggle (4b), CSV headers (4c) and announcements. */
  label: string
  /** 'end' for numbers, so digits line up. Default 'start'. */
  align?: 'start' | 'end'
  width?: DataColumnWidth
  /** The API sort field this column sorts by. Absent: not sortable. */
  sortField?: SortField
  /** Can the user hide it with DataTable.ColumnToggle? Default true. */
  hideable?: boolean
  /**
   * CSV export (DataTable.Export). Absent: the column's raw accessor value (not
   * the formatted cell). A function: the export value. `false`: left out (the
   * selection column). The CSV header is always `label`.
   */
  csv?: false | ((row: TData) => CsvValue)
  // filter?: DataColumnFilter  (Stage 6: the filter UI and how it maps onto a FilterField)
}

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type --
 * Declaration merging: the type parameters must match TanStack's exactly, used or not. */
declare module '@tanstack/react-table' {
  interface ColumnMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
    TValue extends CellData = CellData,
  > extends DataColumnMeta<TData> {}
}
/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type */

export type DataColumnDef<TData extends RowData> = ColumnDef<DataTableFeatures, TData, any> // eslint-disable-line @typescript-eslint/no-explicit-any

/** TanStack's column helper, bound to the DataTable feature set. */
export function createColumnHelper<TData extends RowData>(): ColumnHelper<
  DataTableFeatures,
  TData
> {
  return createTanstackColumnHelper<DataTableFeatures, TData>()
}

type WithMeta<T, TData> = T & { meta: DataColumnMeta<TData> }

/**
 * `helper.accessor`, except `meta` (and so `meta.label`) is required:
 *
 *   dataColumn(helper, 'amount', { meta: { label: 'Amount', align: 'end', sortField: 'amount' } })
 *
 * The plain helper accepts a column without meta; this one doesn't compile.
 * The header text defaults to the label, so it's never written twice.
 */
export function dataColumn<
  TData extends RowData,
  TAccessor extends AccessorFn<TData> | DeepKeys<TData>,
  TValue extends (TAccessor extends AccessorFn<TData, infer TReturn>
    ? TReturn
    : TAccessor extends DeepKeys<TData>
      ? DeepValue<TData, TAccessor>
      : never),
>(
  helper: ColumnHelper<DataTableFeatures, TData>,
  accessor: TAccessor,
  column: TAccessor extends AccessorFn<TData>
    ? WithMeta<DisplayColumnDef<DataTableFeatures, TData, TValue>, TData>
    : WithMeta<IdentifiedColumnDef<DataTableFeatures, TData, TValue>, TData>,
): TAccessor extends AccessorFn<TData>
  ? AccessorFnColumnDef<DataTableFeatures, TData, TValue>
  : AccessorKeyColumnDef<DataTableFeatures, TData, TValue> {
  return helper.accessor(accessor, { header: column.meta.label, ...column })
}
