# Keyboard grid

How the data table works by keyboard: an ARIA grid with one Tab stop, arrow-key navigation, keyboard selection, cells with several controls, row actions and a details drawer, and focus that never jumps on its own. It follows the WAI-ARIA APG [Data Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/); the deviations are listed [at the end](#deviations-from-the-apg).

This is the fourth of the kit's hard problems. 5a: the grid, roving tabindex and selection. 5b: composite cells and interaction mode, row actions, the drawer opened with Enter, keyboard help. 5c adds virtualization (PageUp/PageDown by the visible row count, focus on rows that aren't rendered).

- **Code:** [`src/components/data-table/keyboard/`](../src/components/data-table/keyboard/): `gridNav.ts` (pure navigation), `interaction.ts` (pure interaction mode and focus return), `activeCell.ts` (pure persistence rules), `focusTarget.ts` (roving tabindex markup), `useGridState.ts` (the active cell and focus moves), `useGridKeyboard.ts` (the handlers), `keymap.ts` (the key map as data), `renderCounter.ts` (dev-only)
- **Grid markup:** [`DataTableGrid.tsx`](../src/components/data-table/DataTableGrid.tsx), with the memoized `GridRow`
- **Orders:** [`CustomerCell`](../src/components/data-table/cells/CustomerCell.tsx) (composite), [`RowActions`](../src/features/orders/RowActions.tsx) (widget), [`OrderDetailsDrawer`](../src/features/orders/OrderDetailsDrawer.tsx), focus return in [`OrdersTable`](../src/features/orders/OrdersTable.tsx)
- **Stories:** Storybook → **Data/DataTable/Keyboard** (with a focus trace: the active cell, its row's `aria-rowindex`, the last key)
- **Related:** [data-table.md](data-table.md)

## Keyboard map

Generated from [`keymap.ts`](../src/components/data-table/keyboard/keymap.ts), the same data the keyboard help dialog (`DataTable.KeyboardHelp`, or **?** in the grid) shows. Don't edit the table by hand: change `KEYMAP` and run `pnpm docs:keymap`. A test (`keymap.node.test.ts`) fails when the two drift.

<!-- prettier-ignore-start -->
<!-- keymap:start (generated from keymap.ts: pnpm docs:keymap) -->
| Group | Keys | Action |
| --- | --- | --- |
| Navigation | Tab / Shift+Tab | Move into or out of the table: it is one Tab stop, and you come back to the same cell |
| Navigation | ← / → | Previous or next column (stops at the edges) |
| Navigation | ↑ / ↓ | Previous or next row; up from the first row reaches the column headers |
| Navigation | Home / End | First or last cell in the row |
| Navigation | Ctrl+Home · Mac: ⌘Home / ⌘↑ | First cell of the first row |
| Navigation | Ctrl+End · Mac: ⌘End / ⌘↓ | Last cell of the last row |
| Navigation | Page Up / Page Down | Up or down 10 rows |
| Selection | Space | Select or deselect the row |
| Selection | Shift+Space | Apply the same to every row from the last one you selected |
| Selection | Ctrl+A · Mac: ⌘A | Select every row on this page; again to deselect them |
| Cells & actions | Enter / Space | On a column header: sort by that column |
| Cells & actions | Enter | On a text cell: open the row's details |
| Cells & actions | Enter / F2 | On a cell with several controls (Customer): interact with them |
| Cells & actions | Tab / Shift+Tab | While interacting: next or previous control in the cell (wraps around) |
| Cells & actions | Esc / F2 | While interacting: back to the cell |
| Cells & actions | ? | Show these keyboard shortcuts |
<!-- keymap:end -->
<!-- prettier-ignore-end -->

Keys with Alt are never handled. Shift with a navigation key isn't either (Shift+Arrow is left for range extension). Ctrl+ArrowUp/Down (Mission Control on a Mac) and Ctrl+PageUp/PageDown (switching browser tabs) go to the browser. The mapping is `toNavKey(event)`, a pure function with a test for every alias. The grid accepts Ctrl and ⌘ on every platform; the help dialog only _labels_ the platform's own (`isApplePlatform`), so a wrong guess costs nothing but wording.

Escape isn't bound by the grid itself: in interaction mode it leaves the cell, and inside the bulk bar it clears the selection.

## Roving tabindex

Exactly **one** element inside the grid has `tabIndex={0}`: the active cell's focus target. Every other cell, checkbox and button has `tabIndex={-1}`. So Tab enters the grid once, lands on the cell you were last on, and the next Tab goes to whatever follows the grid (the pagination bar). That's plain browser behavior once the tabindexes are right; nothing intercepts Tab (except inside a composite cell in interaction mode, below).

The grid owns focusability. A control inside a cell never sets its own `tabIndex`. It spreads a helper that gives it the roving value (or nothing, when the same component is used outside a grid): `useFocusTargetProps()` in a widget cell, `useCellInteractive()` in a composite cell.

```tsx
<Checkbox {...useFocusTargetProps()} aria-label={`Select ${name}`} … />
<button {...useCellInteractive()} onClick={filterByName}>{name}</button>
```

**State.** The active cell `{ row, col }` and `interacting` are local UI state, held by `useGridState` inside `useDataTable` (`table.activeCell`, `table.interacting`, `table.focusCell`, `table.returnFocus`). Row −1 is the header; columns count visible columns only. It lives in the table hook, not in the grid component, so it survives the grid unmounting while a new key loads, and so overlays outside the grid (the drawer) can return focus to it.

**Handlers.** The `<table>` has one delegated `onKeyDown`, `onClick`, `onFocus` and `onBlur`. Each cell carries `data-grid-row` / `data-grid-col`, so the handlers resolve the cell from the event target; there's no handler per cell. A click makes the clicked cell active, so the keyboard carries on from where the mouse was. `onFocus` covers focus that arrives some other way (a screen reader moving focus, a programmatic `focus()`); `onBlur` notices focus leaving the grid (it ends interaction mode).

### Cell kinds

`meta.cellKind` on the column says what takes focus:

| Kind               | Focus goes to                                                                                         | In this kit                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `'text'` (default) | The `<td>` itself (`role="gridcell"`). Enter opens the row (`onOpenRow`).                             | Order, Status, Channel, Items, Amount, Created                             |
| `'widget'`         | The cell's ONE interactive element, directly. Its own keys apply (Enter, Space).                      | The selection checkbox (header and rows); the Actions column's ⋯ button    |
| `'composite'`      | The `<td>`; Enter or F2 then moves focus to its first control ([interaction mode](#interaction-mode)) | Customer: a "Filter by {name}" button and a "Copy email for {name}" button |

Headers: a sortable header is a widget cell (its sort button takes focus); a non-sortable one is a text cell.

A widget cell must hold exactly one interactive element: with the widget rule, a second one would be unreachable. Two or more controls make a composite cell.

## Interaction mode

The APG grid pattern's answer to cells with several controls ("[Keyboard Interaction: Editing and Navigating Inside a Cell](https://www.w3.org/WAI/ARIA/apg/patterns/grid/#keyboardinteraction-settingfocusandnavigatinginsidecells)"): the cell is one stop in grid navigation, and the user steps _into_ it to use its controls.

| In a composite cell                           | What happens                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| Enter or F2 (on the cell)                     | Interaction mode on; focus moves to the cell's first control                      |
| Tab / Shift+Tab (interacting)                 | Next / previous control **in that cell**, wrapping around. Focus can't Tab out.   |
| Arrows, Home/End, PageUp/Down, Space…         | Belong to the focused control. The grid doesn't navigate or select.               |
| Escape or F2 (interacting)                    | Interaction mode off; focus returns to the cell. Arrows move between cells again. |
| A click on a control in the cell              | Interaction mode on, from that control (Tab continues from it)                    |
| A click anywhere else in the grid             | Interaction mode off                                                              |
| Focus leaving the grid; a page or view change | Interaction mode off                                                              |

- **Tab stops.** A composite cell's controls have `tabIndex={-1}`; while interacting they get `0`, so they're reachable at all, and the grid's Tab handler keeps the cycle inside the cell (`cycleIndex`). The rules are pure: `interactionKey(event, state)` returns `enter`, `exit`, `next`, `prev`, `pass` or nothing (`interaction.ts`, table-tested).
- **Screen readers.** Every composite cell has `aria-describedby` pointing at ONE visually hidden description per grid: "Press Enter to interact with the cell, Escape to exit". Only composite cells reference it, so text cells stay quiet.
- **Visible controls.** The Customer cell's copy button shows on row hover or focus (so always while interacting, and always on touch screens). It's faded with opacity, never `display: none`, so it stays focusable.
- **Filter by name** writes `?orders.q={name}` with history push (Back returns to the unfiltered list) and announces "Filtered by {name}". It's a view change, so the active cell goes to the first row, same column.

## Enter opens the row; a click doesn't

Enter on a **text** cell of a data row calls `useDataTable({ onOpenRow })`. Orders opens the order's details drawer. Widgets keep their own Enter; composite cells use it for interaction mode; the header has no row to open. Mouse users open it from the row's actions menu: **⋯ → View details**.

A click on a row does **not** open it, deliberately. Clicking a row is what you do to put the active cell somewhere, to select text (an order id to copy), or on the way to a checkbox; if it also opened a modal drawer, every one of those would cost an Escape. Keeping the mouse predictable (a click only focuses) and giving the action an explicit menu item is the less surprising trade. Enter is different: on a focused cell it's an explicit command, and it's what users expect a grid row to do.

## Focus is never stolen

Focus moves only when the user moved the active cell **from inside the grid** (a key or a click). The handler requests it next to the state change, and a layout effect in `useGridState`, after the commit that gave the new target `tabIndex={0}`, focuses it. Every other change to the active cell moves the Tab stop but not focus:

| Change                                      | Active cell                        | Focus   |
| ------------------------------------------- | ---------------------------------- | ------- |
| Arrow, Home/End, PageUp/Down, a click       | moves                              | follows |
| Page or page size (from the pagination bar) | first row, column kept             | stays   |
| View change: sort, filters, search          | first row, column kept             | stays   |
| Refetch, same key                           | kept, clamped to the new row count | stays   |
| Column hidden or shown                      | column clamped                     | stays   |
| Any of these while on the header row        | stays on the header                | stays   |

So after Next page, Shift+Tab back into the grid lands on the first row, in the column you were in. A data load or a background refetch never pulls focus out of the search box.

**The one rescue.** If focus _was_ inside the grid and fell to `<body>` because the focused element unmounted (its row was filtered away, as with "Filter by name", or a refetch removed it), focus goes to the active cell, on the cell itself (interaction mode ends). Without it a keyboard user would be dropped at the top of the page. This only fires when focus was already in the grid and nothing else has it.

(Internally rows are 0-based and the header is row −1: "row 0" in the code is the first row.) The rules are pure functions (`rekeyActiveCell`, `effectiveActiveCell` in [`activeCell.ts`](../src/components/data-table/keyboard/activeCell.ts)). Clamping is read-side only: the stored position isn't overwritten, so a refetch that briefly has fewer rows doesn't lose it. The page-or-view reset is derived during render, like the selection's view-key clear: no effect, no extra commit.

## Overlays opened from the grid: focus return

| Opened from                           | On close, focus goes to                                   |
| ------------------------------------- | --------------------------------------------------------- |
| ⋯ menu: Escape, "Copy order ID"       | The ⋯ button (Radix returns focus to the trigger)         |
| The drawer (Enter, or View details)   | The grid: `table.returnFocus({ rowId })`                  |
| A row's "Mark as…" confirm dialog     | The grid: `table.returnFocus({ rowId })`                  |
| The drawer's "Mark as…" confirm       | The drawer's "Mark as…" button (the drawer is still open) |
| Keyboard help, opened with **?**      | The grid's active cell (`table.returnFocus()`)            |
| Keyboard help, opened from its button | The button (Radix)                                        |

The drawer has **no trigger button**: Enter on a cell opened it, or a menu item that unmounted with its menu. Radix would try to focus whatever was focused when it opened, which may be gone (a status change refetches and can re-sort the page). So `onCloseAutoFocus` prevents Radix's default and calls `table.returnFocus({ rowId })`, which resolves the target with `resolveFocusReturn` (pure, tested):

- the row the drawer was about is still on the page → that row, in the active column (it may have **moved**, e.g. a status change under a sort by status);
- it isn't (filtered out, moved to another page) → the active cell, **clamped** to the rows there now.

When the active cell is the Actions column, "the active cell" is the ⋯ button, so View details → Escape lands back on ⋯.

The menu items that open an overlay (View details, Mark as…) prevent the menu's own focus return, so it doesn't pull focus back to ⋯ underneath the drawer or dialog that's taking it.

## The order details drawer

- Opened with Enter on a text cell, or ⋯ → View details. Width `md`. The title is the order id, with the status pill; the amount (`Amount`, display-sm with the orange glyph); customer (avatar, name, email); channel, items, reference; created and updated, each formatted and relative ("Sep 30, 2026, 2:05 PM · 3 hours ago"). The footer has "Mark as…" (the same flow as everywhere else) and Close.
- **Data: the row snapshot.** The mock list endpoint returns every field of an order, so the drawer shows the row the table already has: no fetch. A real app whose list returns a summary would fetch the full order by id there (a query keyed on the id, with the row as placeholder data).
- After a status change it shows the server's copy of the order straight away, then the table's row once a refetch has it (whichever is newer).

## Row actions and the status flow

The last column, **Actions**, is a utility column (`meta.utility`: the header label is for screen readers only, and it isn't in the column menu), not sortable or hideable, not exported (`csv: false`), 56px wide, and a **widget** cell: the ⋯ button ("Actions for order ORD-000123") is the focus target. Its menu: View details; Mark as… (a submenu of statuses, without the order's current one); Copy order ID (clipboard + "Order ID copied" toast; "Couldn't copy" if the Clipboard API refuses, with the id in the toast so it can still be copied by hand).

"Mark as…" for one order and for a selection share **`useStatusChangeFlow`**: the same request (`{ ids, status }`: one order is a one-id bulk), the same confirm dialog and the same result summary, with singular wording for one order ("Mark order ORD-000123 as shipped?", "Order ORD-000123 marked as shipped", or "couldn't be changed" with the server's reason). The dialog for one order is hosted by `OrdersTable`, above the grid, because the row can unmount under it.

## Keyboard help

`<DataTable.KeyboardHelp slot="end" />` renders an icon button ("Keyboard shortcuts", with a tooltip) and a dialog listing every entry of `KEYMAP`, grouped (Navigation, Selection, Cells & actions), with ⌘ on Apple platforms and Ctrl elsewhere.

**?** (Shift+/ on most layouts: the grid checks `event.key === '?'`, not the physical key) opens it from anywhere in the grid, except in interaction mode, where the key belongs to the control. The part registers its opener with the table on mount; without it, ? does nothing. Closed after **?**, focus returns to the active cell; opened from the button, back to the button.

## Grid semantics

```html
<table
  role="grid"
  aria-label="Orders"
  aria-rowcount="4214"
  aria-colcount="9"
  aria-multiselectable="true"
>
  <tr role="row" aria-rowindex="1">
    <th role="columnheader" aria-colindex="7" aria-sort="descending">…</th>
  </tr>
  <tr role="row" aria-rowindex="52" aria-selected="false">
    <td role="gridcell" aria-colindex="2" tabindex="-1">ORD-000051</td>
    <td role="gridcell" aria-colindex="3" tabindex="-1" aria-describedby="…hint">…</td>
  </tr>
</table>
```

- **`aria-rowindex` is page-global:** `(page − 1) × pageSize + i + 2`; the header is row 1. On page 2 a screen reader says "row 52 of 4,214", which matches "Showing 51–100 of 4,213" in the pagination bar. Page-local indices would say "row 2" on every page, and `aria-rowcount` would be a lie. During a placeholder transition the rows keep the numbers of the page they came from.
- `aria-rowcount` is the total + 1 (the header row); `aria-colcount` is the number of visible columns. Both describe the whole result, not the rendered slice. This is also what 5c's virtualization needs.
- Selectable tables put `aria-selected="true|false"` on every data row and `aria-multiselectable` on the grid. Non-selectable tables have neither.
- **No grid until there are rows.** While loading, the skeleton is a plain table that's `aria-hidden` (the region already says it's busy). Empty, no-results and error states render in its place, with no grid role at all.

## Focus styling

- **Text and composite cells:** the ring is drawn **inside** the cell (`focus-ring-inset`: the same 2px accent outline with a negative offset). An outer ring on a cell at the scroll container's edge would be clipped.
- **Widget cells and a composite cell's controls:** the control keeps its own `focus-ring` (outside, 2px offset). Cells are padded, so it isn't clipped.
- **The active row** gets the subtle `bg-surface-subtle` tint, only while focus is inside the grid (`group-focus-within`). Selected rows keep the accent tint.
- **Keyboard only.** The ring uses `:focus-visible`, like every other control in the kit, so a click shows the row tint but no ring. A ring on every click made the table look busy when used with a mouse, and the tint already shows where keyboard navigation will continue.
- The scroll container has `scroll-padding-top` (the header's height) and, while the bulk bar is up, `scroll-padding-bottom`, so a row that scrolls into view on focus isn't hidden under the sticky header or the bar.

## Render performance: at most two rows per move

Moving the active cell re-renders **at most the row it left and the row it entered** (one row when it moves within a row).

- `GridRow` is `memo`ized. Its props are primitives plus TanStack's row object: `{ row, rowIndex, rowOffset, isSelected, activeCol, interacting, columnsKey, hintId }`. `activeCol` is `null` and `interacting` `false` for every row but the active one, so only two rows see a changed prop. `columnsKey` (the visible column ids) re-renders every row when columns are shown or hidden.
- No per-cell handlers or inline callbacks: one `onKeyDown`, `onClick`, `onFocus` and `onBlur` on the table, reading coordinates from data attributes. Cell props come from a pure `gridCellProps()`, not a hook.
- Cell renderers read **narrow, stable** contexts, never the table context (which changes on every render; context consumers skip `memo`): `DataTableCellContext` (the selection, for the checkboxes), `DataTableParamsContext` (just `setParams`, for the Customer cell, so a checkbox click doesn't re-render 50 Customer cells), and the orders' `OrderActionsContext` (memoized callbacks, for the ⋯ menus).
- Widget and composite cells get their roving `tabIndex` from a per-cell context holding a primitive (`0` or `-1`), so only the affected controls re-render.
- **Row identity has to be stable.** TanStack's row objects are only stable while the `data` array is. The query layer's data is (structural sharing). A test harness that builds a new page object on each render makes every row "new", which the render-count test caught.

**Enforced by a test.** `useRenderCount(row.id)` is a dev-only counter: rows report each render to a `RenderCounterContext` callback that tests provide. Without a provider it does nothing, and in production builds the call is compiled out. `keyboard.test.tsx` moves the active cell down five times and asserts each move rendered exactly the two expected rows, and that a move within a row rendered one.

## Disabled controls stay focusable

A disabled element can't take focus, and in a roving tabindex the active cell's checkbox may be the grid's only Tab stop. So while a placeholder page is shown, the selection checkboxes are `aria-disabled` (styled as disabled, with their clicks ignored) rather than `disabled`. Otherwise, after a page change with the active cell in the selection column, the grid would have no Tab stop at all until the data settled.

## Testing

- **`gridNav` (table-driven):** every key from the four corners, the edges, the middle and the header (67 rows); clamping, `rowCount` 0, page steps larger than what's left, and out-of-range starting positions (18 rows); `clampPos` (6).
- **`toNavKey`:** plain keys, Ctrl and Cmd aliases, combos left to the browser, Alt, Shift and non-navigation keys (35 rows).
- **Interaction mode (pure):** `interactionKey` for entering (Enter, F2, and every case that isn't: text and widget cells, controls, the header, modifiers), exiting (Escape, F2), Tab / Shift+Tab, and keys passed to the control; `cycleIndex` wrapping both ways; `interactingAfterPointer` (a click elsewhere exits); `resolveFocusReturn` (row still there, moved, gone, page shorter, no rows, fewer columns).
- **Interaction mode (DOM):** Enter → the name button, Tab → copy → wraps, Shift+Tab wraps back, Escape → the cell, arrows move cells again; F2 in and out; navigation keys ignored while interacting; Space selects on the cell but not inside it; a click on a control enters, elsewhere exits; focus leaving the grid exits; the single shared description; filter by name (URL, push, announcement); the focus rescue when the focused row unmounts.
- **Enter / help:** Enter opens the row only from a text cell of a data row; a click never does; the Actions cell focuses its button; **?** opens the help and returns focus to the cell, not while interacting; the help's own button gets focus back.
- **Drawer (OrdersTable, MSW):** Enter on Amount opens the drawer for that order, Escape returns focus to the same cell (same `aria-rowindex` / `aria-colindex`); a status change from the drawer returns to its "Mark as…" button, and closing returns to the grid row.
- **`useStatusChangeFlow`:** bulk and single wording, the same `{ ids, status }` request, the single-order failure toast with the server's reason. `summarizeBulkResult`'s singular cases.
- **Keymap:** every entry has keys, a description and a known group; ⌘/Ctrl labels and Mac-only aliases; **the docs table equals `keymapMarkdown()`**; `isApplePlatform` for Client Hints, `navigator.platform` and the user agent.
- **Persistence, roving tabindex, render count:** as in 5a (persistence through the real hook and URL; exactly one `tabIndex={0}`; ≤ 2 rows per move).
- **Stories** (real Chromium, keyboard only, axe): Data/DataTable/Keyboard. **Keyboard Only** (5a): Tab in and out, every navigation key, sorting from the header, Space / Shift+Space / Ctrl+A, a page change with the column kept and `aria-rowindex` 52. **Composite Cell**: into the Customer cell, Tab wraps, Escape out, arrows again, Space on the cell vs inside it, then the name filters the URL and the rows. **Row Actions And Drawer**: the ⋯ button takes focus directly, Enter opens the menu, View details opens the drawer, Escape returns to ⋯; Enter on Amount opens that order's drawer and returns to the same cell. **Keyboard Help**: ? opens it, Escape returns to the cell. axe also runs with the drawer open, the menu open and interaction mode active (stories that end in those states).

## Deviations from the APG

1. **Rows, not cells, are selected.** The APG data grid suggests Shift+Space to select a row and Ctrl+Space a column. The kit selects rows only, so plain Space toggles the row (no cell selection competes for it) and Shift+Space selects a range, like Shift+click. Ctrl+Space isn't bound.
2. **Shift+Space applies the row's new state to the range** (4b's rule): on an unselected row it selects the range, on a selected row it deselects it. The APG doesn't define ranges.
3. **Ctrl/Cmd+A selects the page, not "all".** Selection is page-by-page ([data-table.md](data-table.md#the-500-cap): "select all matching" was cut). Pressing it again clears the page.
4. **Widgets keep their own keys.** Space on a focused checkbox is the checkbox's (Shift+Space there is a range too); Enter or Space on the ⋯ button opens its menu. Space only toggles the row when the focus is on the cell itself. This matches the APG's guidance that a widget in a cell handles its own keys.
5. **The header row survives a view change.** The persistence rule says "row resets to 0", but a sort is a view change made from the header. Resetting would leave focus on the sort button while the grid thinks it's on the first row, and the next ArrowDown would skip a row.
6. **PageDown from the header** moves `pageStep` rows counted from the header row (to row 10 with step 10). PageUp from the header stays put.
7. **Not bound (yet):** Shift+Arrow range extension, Ctrl+Space, and Cmd+ArrowLeft/Right as Home/End aliases (on a Mac, Fn+Arrow already sends Home/End).
8. **Four delegated handlers.** Besides `onKeyDown` and `onClick` there's `onFocus` (focus that arrives without a key or click still updates the active cell) and `onBlur` (focus leaving ends interaction mode and feeds the rescue).
9. **Tab is trapped inside a composite cell while interacting**, wrapping, as the APG describes for cells whose content "consumes" the keys; the APG also allows letting Tab move out of the cell. Trapping keeps "Escape to exit" the one way out, which the hint announces.
10. **Enter on a text cell opens the row**: an app-level action the APG doesn't define. It's only bound when the table passes `onOpenRow`.
11. **Escape after a toast.** A toast is a dismissable layer above the drawer, so the first Escape after a status change (with its toast still up) dismisses the toast, and the second closes the drawer. That's Radix's layer order, kept rather than fought; the drawer's Close buttons always work.
12. **Truncated text by keyboard.** A truncated text cell's tooltip opens on hover only; focusing the cell doesn't show it. Screen readers get the full text either way.
