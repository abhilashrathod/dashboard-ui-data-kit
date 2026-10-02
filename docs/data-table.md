# Data table

The kit's data table: server-driven sorting and pagination, search, density, and every data state, on top of TanStack Table v9. This page is the API contract and the reasoning behind it.

## API rules

1. **Features are opt-in child components, not boolean props.** `<DataTable>` takes at most three props: `table`, `aria-label` and `children`. Search, density, the grid and pagination are parts you compose (`<DataTable.Search />`); a feature you don't render doesn't exist. A type-level test fails if a fourth prop is added.
2. **Column behavior lives in typed column `meta`.** Label, alignment, width and sort mapping are declared once per column (filters and CSV join them in later stages). Headers, the toolbar, filters and export all read `meta`; nothing is configured twice.
3. **The table does not fetch.** It receives a `source` (`useOrdersTableData('orders')`: URL params plus a `DataState`) and renders it.
4. **Escape hatch: `table.instance`** is the TanStack Table instance, for anything the parts don't cover.

- **Code:** [`src/components/data-table/`](../src/components/data-table/)
- **Orders columns:** [`src/features/orders/orderColumns.tsx`](../src/features/orders/orderColumns.tsx)
- **Stories:** Storybook → **Data/DataTable** (live MSW API, with the URL bar and request log in a dev drawer)
- **Related:** [url-state.md](url-state.md) (where the params come from), [data-states.md](data-states.md) (what `DataState` means)

## Usage

```tsx
import { DataTable, useDataTable } from '@/components'
import { useOrdersTableData } from '@/lib/query'
import { getOrderRowId, orderColumns } from './orderColumns'

export function OrdersTable() {
  const source = useOrdersTableData('orders') // URL params → query → DataState
  const table = useDataTable({
    id: 'orders',
    columns: orderColumns, // module scope: stable identity
    source,
    getRowId: getOrderRowId,
    selectable: true, // the selection column + table.selection
  })

  return (
    <DataTable table={table} aria-label="Orders">
      <DataTable.Toolbar>
        <DataTable.Search />
        <DataTable.ColumnToggle slot="end" />
        <DataTable.DensityToggle slot="end" />
      </DataTable.Toolbar>
      <DataTable.Grid className="max-h-[48rem]" />
      <DataTable.Pagination />
      <DataTable.BulkBar>
        {(selection) => <BulkStatusAction selection={selection} />}
      </DataTable.BulkBar>
    </DataTable>
  )
}
```

Columns are defined once, outside any component:

```tsx
const helper = createColumnHelper<Order>()

export const orderColumns = helper.columns([
  dataColumn(helper, 'amount', {
    meta: { label: 'Amount', align: 'end', sortField: 'amount', width: { min: 120, ideal: 136 } },
    cell: (info) => <AmountCell value={info.getValue()} />,
  }),
  dataColumn(helper, (order) => order.customer.name, {
    id: 'customer',
    meta: { label: 'Customer', sortField: 'customer', width: { min: 240, grow: true } },
    cell: (info) => <CustomerCell {...info.row.original.customer} />,
  }),
  // …
])
```

`dataColumn` is `helper.accessor` with `meta` required, so a column without a label doesn't compile (there's a `@ts-expect-error` test). The header text defaults to `meta.label`.

### The parts

| Part                      | What it does                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<DataTable>`             | Provides the table to its parts and renders the card. The card has no horizontal padding, so the grid bleeds to its edges; each part pads itself.                                                 |
| `DataTable.Toolbar`       | A wrapping row with a start and an end area. Children go to the end with `slot="end"`, or inside `DataTable.Toolbar.End`.                                                                         |
| `DataTable.Search`        | A `SearchInput` for `params.q`: a local draft, committed 300ms after the last keystroke (or on Enter) with history `replace`. See [Search: the draft and the URL](#search-the-draft-and-the-url). |
| `DataTable.DensityToggle` | Comfortable / compact, as a labelled radiogroup of native radios. Density is a device preference (`setDensity`: localStorage and `<html data-density>`), not list state, so it's not in the URL.  |
| `DataTable.Grid`          | The table, inside a `DataBoundary`: skeleton, empty, no-results, error, and the refetch bar, stale banner and placeholder dimming over the rows. `className` goes on the scroll container.        |
| `DataTable.Pagination`    | "Showing 51–100 of 4,213", rows per page (25 / 50 / 100 / 500), "Page 2 of 85", previous / next. Each change is a URL push. Hidden when there is nothing to page through.                         |
| `DataTable.ColumnToggle`  | "Columns": a menu with a checkbox per data column (labels from `meta.label`) that stays open while toggling, then "Reset to default". See [Column visibility](#column-visibility).                |
| `DataTable.BulkBar`       | A render prop, `{(selection) => actions}`, shown only while rows are selected: "{n} selected", the actions, and Clear. See [The bulk bar](#the-bulk-bar).                                         |

## Column meta reference

`DataColumnMeta` augments TanStack's `ColumnMeta` (declaration merging in [`columns.ts`](../src/components/data-table/columns.ts)), so `column.columnDef.meta` is typed everywhere, including inside TanStack's own types.

| Field       | Type                                              | Default        | Read by                                                                                                                                        |
| ----------- | ------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`     | `string` (**required**)                           |                | Header text, sort button name, announcements, the column toggle; CSV headers (4c)                                                              |
| `align`     | `'start' \| 'end'`                                | `'start'`      | Header and cells (numbers are end-aligned so digits line up), skeleton bars                                                                    |
| `width`     | `{ min: number; ideal?: number; grow?: boolean }` | `{ min: 120 }` | The grid track: `minmax(min, ideal)`, or `minmax(min, 1fr)` when `grow` or no `ideal`. The sum of `min`s is where horizontal scrolling starts. |
| `sortField` | `SortField`                                       | none           | Maps the column to the API sort field. Absent means not sortable: the header is plain text.                                                    |
| `hideable`  | `boolean`                                         | `true`         | `false`: always shown, checked and disabled in the column menu                                                                                 |
| `filter`    | (Stage 6)                                         |                | Typed placeholder, commented out until filters land                                                                                            |
| `csv`       | `false` (placeholder)                             |                | `false` leaves the column out of CSV (the selection column sets it). 4c widens it to an object for exported columns.                           |

`sortField` is typed as the contract's `SortField`, so a column can't claim to sort by a field the API doesn't support.

## Sorting and paging are derived from the URL

[`useDataTable`](../src/components/data-table/useDataTable.ts) builds a TanStack Table with `manualSorting` and `manualPagination` and only the core row model: the server sorts and pages, and TanStack only lays out what it's given. Its `sorting` and `pagination` state are **derived from `params` on every render**. There's no table-local copy to keep in sync:

```
params.sort "-amount"  ──sortingFromParams──►  [{ id: <column with meta.sortField 'amount'>, desc: true }]
params.page, pageSize  ──────────────────────►  { pageIndex: page - 1, pageSize }

header click → column.toggleSorting()
            → onSortingChange(updater)
            → sortUpdaterFor: which column was toggled? its meta.sortField?
            → setParams(setSort('amount'))      the 3a action: none → desc → asc → default
            → URL changes → params → sorting (back to the top)
```

TanStack proposes a next sort state from its own cycle; the table only takes **which column** was toggled from it and lets `setSort` apply the kit's cycle. So the cycle is defined once, in the URL layer, and Back, a shared link and a header click all agree. A sort field no column maps to derives to `[]`, so no header claims a sort it doesn't show.

- **Accessible sort headers.** The `<th>` carries `aria-sort` (`ascending` / `descending`) on the sorted column only. Sortable headers hold a button whose name says what a click will do ("Amount, sort descending", "Amount, clear sort"), computed from the same `setSort` cycle. The default sort (`-createdAt`) shows as Created, descending.
- **`pageCount`** is `ceil(total / pageSize)`. While a new key loads, `total` keeps the last known value, so the page count and the pagination bar don't flicker. `rows` is the ready page's rows, or `[]`.
- **Stable inputs.** `columns` come from module scope and `data` falls back to a module-level empty array, so TanStack never sees new references it would have to rebuild for. `useTable` builds the core table once and updates its options on each render.

## Why the table doesn't fetch

A table that fetches has to own the request's inputs (the params), the request, and its states. That makes it the second owner of state the URL already owns (see [url-state.md](url-state.md)) and the second implementation of loading, error and empty states that `DataBoundary` already has. Receiving a `source` instead keeps the table a renderer:

- **One source of truth.** Params come from the URL through `useListParams`; the table writes back through `setParams`. Nothing in the table can drift.
- **No double fetch.** The query key, cancellation, prefetch of the next page and `keepPreviousData` all live in the query layer, and are proven there (`noDoubleFetch.test.tsx`). The table can't accidentally add a request.
- **Any data source.** `DataTableSource<T>` is `{ params, setParams, resetParams, dataState }`. A table over a different endpoint, a client-side array, or a test fixture provides the same shape; the unit tests hand in a fixed `DataState` and never touch the network.

## The escape hatch

`table.instance` is the TanStack Table v9 instance (`ReactTable<DataTableFeatures, TData>`), for things the parts don't cover yet: reading `getHeaderGroups()`, building a custom part, or calling `instance.setPageIndex(…)`. Its sort and pagination setters go through the same `onSortingChange` / `onPaginationChange` handlers, so they write the URL like everything else.

Registered features: `rowSortingFeature`, `rowPaginationFeature` and `columnVisibilityFeature` (v9 makes features explicit; unused ones aren't bundled). Selection is the kit's own model, not `rowSelectionFeature`: it keeps a snapshot of every selected row across pages, which TanStack's id map doesn't. `instance.setColumnVisibility(…)` goes through the same rules as the menu.

## Native table elements, laid out with CSS grid

The grid is `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>` and `<td>`, with `display: grid` on the table, the row groups and every row, and one shared `grid-template-columns` (a CSS variable built from the columns' `meta.width`).

- **Real table semantics.** Screen readers announce rows and columns, header association works, and `aria-sort` sits on a real column header. A `div` grid would have to recreate all of that with ARIA. The roles are also stated explicitly (`role="table"`, `row`, `cell`…), because some browsers drop a table's implicit semantics when its `display` changes.
- **Rows are independent grid lines.** Each `<tr>` lays itself out from the shared template, so Stage 5 can virtualize (render a window of rows, absolutely positioned) without changing the markup or the column logic. A classic `display: table` layout sizes columns from all rows' content, which virtualization breaks.
- **Content-independent widths.** `minmax(min px, ideal px | 1fr)` doesn't depend on cell content, so columns don't jump as pages change.
- **Scrolling.** The scroll container wraps the table and scrolls both ways; the header is `position: sticky` at its top. Below the sum of the column minimums the table scrolls horizontally inside the card. The caller caps the height with `className`.

The skeleton is the same table: the real header (labels and sort indicators, but not yet buttons) and 8 rows whose bars follow each column's alignment. Nothing shifts when the data arrives.

## Search: the draft and the URL

The draft is UI state; the URL is app state. What's in the box is the text being typed. The list only sees it once it's committed: 300ms after the last keystroke, or immediately on Enter, with history `replace` so typing never creates Back steps.

Going the other way is subtler. When `q` changes from **outside** (Back, Clear filters, a shared link) the box must follow the URL. But the box's own commit changes `q` too, and the URL stores the trimmed text, so naively copying `q` into the draft would eat a trailing space mid-typing ("acme " → "acme"), or fight the keyboard. So the box remembers the URL value it last agreed with, and when `q` differs from that it adopts `q` **only if `q` also differs from what the draft already says** (trimmed). Its own commit always matches the draft, so it never resets it; a real outside change always does. This is derived state, updated during render; no effect copies the URL into state. A URL change also cancels a pending commit, so a debounce scheduled before Back can't overwrite what Back restored.

## Announcements

Polite, through the shared announcer, and only after the data **settles** (ready, and not the previous key's placeholder rows), so a screen reader never hears about rows that aren't on screen yet:

| Change                           | Message                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------- |
| The sort changed                 | "Sorted by Amount, descending"                                                    |
| Back to the default sort         | "Sort cleared, back to Created, descending"                                       |
| The visible range changed        | "Showing 51–100 of 4,213"                                                         |
| Both (a sort on page 3 → page 1) | One message: "Sorted by Amount, descending. Showing 1–50 of 4,213"                |
| The selection count changed      | "12 selected" / "Selection cleared", 400ms after the last click                   |
| A view change cleared it         | Folded into the settle message: "Sorted by Amount, descending. Selection cleared" |
| A column was toggled             | "Channel column hidden" / "Channel column shown"                                  |

The selection-cleared message rides along with the sort message instead of being sent separately because the announcer keeps only the last of two messages that arrive close together, so one of the two would be lost.

The initial load is never announced: nothing changed from the user's point of view, and `DataBoundary` already covers loading and errors (see [data-states.md](data-states.md#announcements-and-why-errorstate-doesnt-use-rolealert)).

## Column visibility

`DataTable.ColumnToggle` hides and shows columns; `useDataTable` calls `useColumnVisibility(tableId, columns)` internally and feeds it to TanStack's `state.columnVisibility`, so no prop was added to `<DataTable>`. The grid tracks are rebuilt from the visible columns only, so hiding one gives its space to the rest.

**A preference, not view state.** Visibility is stored per user in localStorage (`dtk:columns:${tableId}`), not in the URL. The URL says _what data_ you're looking at, and it's meant to be shared; how one person likes their columns isn't part of that. A link you send shouldn't hide the recipient's columns, and Back shouldn't undo a column change.

- Columns with `meta.hideable === false` are always visible (shown checked and disabled).
- At least one hideable column always stays visible: the last one's checkbox is disabled.
- Reading is defensive: bad JSON, the wrong shape, unavailable storage or a stored state that would hide everything fall back to the defaults; ids that no longer exist are ignored. Writes are wrapped in try/catch.
- The menu stays open while toggling (`onSelect` → `preventDefault`), since changing several columns is the common case. Each toggle is announced.

## Selection

`useDataTable({ selectable: true })` adds the selection column (first, not hideable, not sortable, `meta.csv: false`) and turns on `table.selection`. That option is the one switch: `<DataTable.BulkBar>` doesn't add the column by itself, because a hidden side effect of rendering a child would be harder to reason about than an explicit flag.

```ts
table.selection: {
  ids: string[]; rows: TData[]; count: number
  isSelected(id); toggle(id, { range? }); selectPage(); clearPage(); clear(); remove(ids)
}
```

The model ([`selection.ts`](../src/components/data-table/selection.ts)) is a `Map<rowId, row>`: each selected row's snapshot is kept, so later stages can act on rows from other pages (CSV export of the selection in 4c) without refetching them. `rows` returns the current page's fresh row when it has one, and the snapshot otherwise.

**It's local React state, not URL state.** A selection is a transient working set ("these 12 rows, right now"), not a view anyone shares, bookmarks or returns to with Back.

### Scope: persist across pages, clear on a new view

| Change                                     | Selection |
| ------------------------------------------ | --------- |
| Next / previous page, page size            | kept      |
| A refetch (window focus, after a mutation) | kept      |
| Sort, filters or search (`q`)              | cleared   |

Paging through a result set to pick rows is the point of a cross-page selection. But a selection made under one filter, kept under another, is a trap: "12 selected" would include rows the user can no longer see, and a bulk action would hit them. So the selection belongs to a **view**: `viewKeyOf(params)` is the canonical params key with page and page size left out.

The clear is **derived during render**, not synced in an effect. The selection state remembers the view key it was made under; when the current key differs, `useSelection` resets it in the same render (React's "storing information from previous renders" pattern). No render ever shows the old selection against the new view, and it can't loop: after the reset the keys are equal. It doesn't matter what changed the view (a header click, Clear filters, Back, a pasted link), because it keys off the result, not the cause.

While a placeholder page is shown (the previous key's rows, dimmed), the row checkboxes are disabled: those rows may belong to the previous view.

### Range select

Shift+click on a row checkbox applies the clicked row's new state to every row between it and the last clicked row, on the current page: shift-clicking an unselected row selects the range, shift-clicking a selected one deselects it. It works in both directions. The anchor is per page, so after a page change a shift+click is a plain toggle (which sets a new anchor). Shift+Space on a focused checkbox does the same for keyboard users.

### The 500 cap

The bulk endpoint accepts at most 500 ids (`BULK_STATUS_MAX_IDS`, in the contract). The selection itself isn't capped; above 500 the bulk action is disabled (focusable, `aria-disabled`) with the reason in a tooltip and as its description: "Bulk actions support up to 500 orders".

**"Select all matching" was cut.** Selecting every row of a 4,213-row result means sending 4,213 ids, or a server endpoint that applies a change to "everything matching this filter" (with its own consistency questions: rows that start or stop matching mid-operation). The mock API has neither, so the kit offers page-by-page selection only.

### Styling

Selected rows get `data-selected`: the accent tint (`bg-accent-subtle`, contrast-tested with `fg` and `fg-muted` in both themes) and a 3px accent bar on the left edge (an inset shadow, so it takes no layout space). The checkbox carries the selected state for assistive tech; Stage 5's `grid` role adds `aria-selected` on the row.

## The bulk bar

`<DataTable.BulkBar>{(selection) => actions}</DataTable.BulkBar>` renders only while something is selected: "{n} selected", the actions, and Clear.

- **Pinned to the bottom of the card** (sticky), so it stays in view while the card scrolls. It uses the inverse surface: a dark pill in light mode, a light one in dark mode. That's done by giving the bar the opposite `data-theme`, so the controls inside (buttons, menus' triggers) are just the normal components and look native on it.
- **It doesn't cover the last rows:** while it's visible the grid's scroll container gets extra bottom padding.
- **It never takes focus when it appears.** Escape while focus is inside it clears the selection (menus and dialogs opened from it handle their own Escape first). When the bar disappears with focus inside it (Clear, Escape), focus moves to the table's region instead of falling to `<body>`.

## Bulk status changes (Orders)

[`BulkStatusAction`](../src/features/orders/BulkStatusAction.tsx) is the Orders bar's action: "Mark as…" → Paid / Shipped / Refunded / Failed → a ConfirmDialog ("Mark 8 orders as shipped?", danger tone for refunded and failed) → `useBulkUpdateStatus`.

**The server is the authority on transitions.** The client doesn't pre-filter which orders "can" become shipped. The rules live in one place (the server), and the response says what happened to every id: `{ updated, failed: [{ id, reason }] }`. A client copy of the rules would drift, and would turn a server rule change into a client bug.

**Partial success is a normal outcome**, summarized by [`summarizeBulkResult`](../src/features/orders/summarizeBulkResult.ts):

| Result       | Toast                                                        |
| ------------ | ------------------------------------------------------------ |
| All updated  | success: "8 orders marked as shipped"                        |
| Some failed  | default: "5 updated, 3 couldn't be changed" + "View details" |
| None updated | danger: "No orders could be changed" + "View details"        |

"View details" opens a dialog listing each failed id with the server's reason, verbatim. It's hosted above the table (`BulkDetailsProvider`), so it still opens after the bar has gone.

**Failed rows stay selected.** After a result, only the updated ids leave the selection. What's left is exactly what didn't change, ready to inspect, act on differently, or clear. The deselection happens once the dialog has closed, so the change is visible, and focus returns to "Mark as…" (or to the table, if nothing is left selected).

**A failed request** (5xx, network) keeps the dialog open with the error inline, and the selection untouched. Mutations then invalidate every order list and the metrics (see [url-state.md](url-state.md#no-optimistic-updates)): no optimistic updates.

## Testing

- **Unit** ([`__tests__/`](../src/components/data-table/__tests__/)): sorting derivation and the `onSortingChange` → `setSort` mapping, pagination math (partial last page, total 0), header `aria-sort` and button names, the escape hatch writing the URL, the search draft (debounce with fake timers, Enter, outside changes, no reset loop), announcements, and the type-level checks (`dataColumn` requires a label; the root has exactly three props).
- **Selection and visibility (unit):** the pure model (toggle, ranges in both directions, deselecting ranges, the per-page anchor, selectPage / clearPage, remove, the header state), the scope rules through the real hook and URL (kept across pages and sizes, cleared on sort / q / filters and on Back to another view, kept across refetches), `useColumnVisibility` (persistence, bad JSON, unknown ids, non-hideable, the last-visible guard), and `summarizeBulkResult` (all / partial / none, plurals).
- **Stories** (real Chromium, MSW, axe in both themes and densities): the sort cycle with `aria-sort` and the announcement, Next page served from the prefetch cache (no new request in the log), search with at most one history entry, Back restoring sort and search, Clear filters, page size 100, and the narrow container's horizontal scroll with a sticky header. For 4b: the header checkbox (mixed state), shift+click, selection across pages and cleared by a sort, Escape in the bar, a partial bulk success (toast, details, failed rows still selected), a failed bulk request (inline error, dialog open), and columns hidden, persisted across a remount, reset, and the last one locked. The axe check also runs with the column menu open, the dialogs open and the bar visible.
