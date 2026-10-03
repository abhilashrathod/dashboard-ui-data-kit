# Keyboard grid

How the data table works by keyboard: an ARIA grid with one Tab stop, arrow-key navigation, keyboard selection, and focus that never jumps on its own. It follows the WAI-ARIA APG [Data Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/); the deviations are listed [at the end](#deviations-from-the-apg).

This is the fourth of the kit's hard problems. Stage 5b adds composite cells (Enter to go in, Escape to come out), and 5c adds virtualization (PageUp/PageDown by the visible row count, focus on rows that aren't rendered).

- **Code:** [`src/components/data-table/keyboard/`](../src/components/data-table/keyboard/): `gridNav.ts` (pure navigation), `activeCell.ts` (pure persistence rules), `focusTarget.ts` (roving tabindex markup), `useGridKeyboard.ts` (handlers and focus), `renderCounter.ts` (dev-only)
- **Grid markup:** [`DataTableGrid.tsx`](../src/components/data-table/DataTableGrid.tsx), with the memoized `GridRow`
- **Stories:** Storybook → **Data/DataTable/Keyboard** (with a focus trace: the active cell, its row's `aria-rowindex`, the last key)
- **Related:** [data-table.md](data-table.md)

## Keyboard map

| Key                                        | Action                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Tab / Shift+Tab                            | Enter the grid on the active cell; the next Tab leaves it. The grid is one Tab stop.                          |
| ArrowLeft / ArrowRight                     | One column. Stops at the edges (no wrapping).                                                                 |
| ArrowUp / ArrowDown                        | One row. Up from the first row enters the header row; Down from the header is the first row.                  |
| Home / End                                 | First / last column of the current row                                                                        |
| Ctrl+Home · **Mac:** Cmd+ArrowUp, Cmd+Home | First cell of the first data row                                                                              |
| Ctrl+End · **Mac:** Cmd+ArrowDown, Cmd+End | Last cell of the last data row                                                                                |
| PageUp / PageDown                          | 10 rows (5c: the number of visible rows). PageUp stops at the first row, never the header.                    |
| Enter / Space on a header                  | Sorts (it's the sort button's own behavior). Space on a non-sortable header does nothing.                     |
| Space                                      | Toggles the row's selection and sets the range anchor (selectable tables)                                     |
| Shift+Space                                | Applies the row's new state to the range from the anchor (the 4b shift+click rule)                            |
| Ctrl+A · **Mac:** Cmd+A                    | Selects every row on the page; when they're all selected already, clears the page                             |
| Escape                                     | Not bound by the grid. The bulk bar uses it (clears the selection); 5b will use it to leave a composite cell. |

Keys with Alt are never handled. Shift with a navigation key isn't either (Shift+Arrow is left for range extension). Ctrl+ArrowUp/Down (Mission Control on a Mac) and Ctrl+PageUp/PageDown (switching browser tabs) go to the browser. The mapping is `toNavKey(event)`, a pure function with a test for every alias.

## Roving tabindex

Exactly **one** element inside the grid has `tabIndex={0}`: the active cell's focus target. Every other cell, checkbox and sort button has `tabIndex={-1}`. So Tab enters the grid once, lands on the cell you were last on, and the next Tab goes to whatever follows the grid (the pagination bar). That's plain browser behavior once the tabindexes are right; nothing intercepts Tab.

The grid owns focusability. A control inside a cell never sets its own `tabIndex`. It spreads `useFocusTargetProps()`, which gives it the roving value (or nothing, when the same component is used outside a grid):

```tsx
<Checkbox {...useFocusTargetProps()} aria-label={`Select ${name}`} … />
```

**State.** The active cell, `{ row, col }`, is local UI state in `useDataTable` (`table.activeCell`, `table.setActiveCell`). Row −1 is the header; columns count visible columns only.

**Handlers.** The `<table>` has one delegated `onKeyDown`, one `onClick` and one `onFocus`. Each cell carries `data-grid-row` / `data-grid-col`, so the handlers resolve the cell from the event target; there's no handler per cell. `onKeyDown` runs `toNavKey` → `gridNav` → `setActiveCell`. A click makes the clicked cell active, so the keyboard carries on from where the mouse was. `onFocus` covers focus that arrives some other way (a screen reader moving focus, a programmatic `focus()`).

### Cell kinds

`meta.cellKind` on the column says what takes focus:

| Kind               | Focus goes to                                            | Used by                                                 |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------- |
| `'text'` (default) | The `<td>` itself (`role="gridcell"`)                    | Every data column                                       |
| `'widget'`         | The cell's one interactive element, directly             | The selection column (checkbox, in the header and rows) |
| `'composite'`      | 5b: the cell, then Enter/F2 to move between its controls | Behaves like `'text'` until 5b                          |

Headers: a sortable header is a widget cell (its sort button takes focus); a non-sortable one is a text cell.

A widget cell must hold exactly one interactive element. Two buttons in a cell is a composite cell: with the widget rule, the second one would be unreachable.

## Focus is never stolen

Focus moves only when the user moved the active cell **from inside the grid** (a key or a click). The handler sets a flag next to the state change, and a layout effect, after the commit that gave the new target `tabIndex={0}`, focuses it and clears the flag. Every other change to the active cell moves the Tab stop but not focus:

| Change                                      | Active cell                        | Focus   |
| ------------------------------------------- | ---------------------------------- | ------- |
| Arrow, Home/End, PageUp/Down, a click       | moves                              | follows |
| Page or page size (from the pagination bar) | first row, column kept             | stays   |
| View change: sort, filters, search          | first row, column kept             | stays   |
| Refetch, same key                           | kept, clamped to the new row count | stays   |
| Column hidden or shown                      | column clamped                     | stays   |
| Any of these while on the header row        | stays on the header                | stays   |

So after Next page, Shift+Tab back into the grid lands on the first row, in the column you were in. A data load or a background refetch never pulls focus out of the search box.

(Internally rows are 0-based and the header is row −1: "row 0" in the code is the first row.) The rules are pure functions (`rekeyActiveCell`, `effectiveActiveCell` in [`activeCell.ts`](../src/components/data-table/keyboard/activeCell.ts)). Clamping is read-side only: the stored position isn't overwritten, so a refetch that briefly has fewer rows doesn't lose it. The page-or-view reset is derived during render, like the selection's view-key clear: no effect, no extra commit.

## Grid semantics

```html
<table
  role="grid"
  aria-label="Orders"
  aria-rowcount="4214"
  aria-colcount="8"
  aria-multiselectable="true"
>
  <tr role="row" aria-rowindex="1">
    <th role="columnheader" aria-colindex="7" aria-sort="descending">…</th>
  </tr>
  <tr role="row" aria-rowindex="52" aria-selected="false">
    <td role="gridcell" aria-colindex="2" tabindex="-1">ORD-000051</td>
  </tr>
</table>
```

- **`aria-rowindex` is page-global:** `(page − 1) × pageSize + i + 2`; the header is row 1. On page 2 a screen reader says "row 52 of 4,214", which matches "Showing 51–100 of 4,213" in the pagination bar. Page-local indices would say "row 2" on every page, and `aria-rowcount` would be a lie. During a placeholder transition the rows keep the numbers of the page they came from.
- `aria-rowcount` is the total + 1 (the header row); `aria-colcount` is the number of visible columns. Both describe the whole result, not the rendered slice. This is also what 5c's virtualization needs.
- Selectable tables put `aria-selected="true|false"` on every data row and `aria-multiselectable` on the grid. Non-selectable tables have neither.
- **No grid until there are rows.** While loading, the skeleton is a plain table that's `aria-hidden` (the region already says it's busy). Empty, no-results and error states render in its place, with no grid role at all.

## Focus styling

- **Text cells:** the ring is drawn **inside** the cell (`focus-ring-inset`: the same 2px accent outline with a negative offset). An outer ring on a cell at the scroll container's edge would be clipped.
- **Widget cells:** the control keeps its own `focus-ring` (outside, 2px offset). Cells are padded, so it isn't clipped.
- **The active row** gets the subtle `bg-surface-subtle` tint, only while focus is inside the grid (`group-focus-within`). Selected rows keep the accent tint.
- **Keyboard only.** The ring uses `:focus-visible`, like every other control in the kit, so a click shows the row tint but no ring. A ring on every click made the table look busy when used with a mouse, and the tint already shows where keyboard navigation will continue.
- The scroll container has `scroll-padding-top` (the header's height) and, while the bulk bar is up, `scroll-padding-bottom`, so a row that scrolls into view on focus isn't hidden under the sticky header or the bar.

## Render performance: at most two rows per move

Moving the active cell re-renders **at most the row it left and the row it entered** (one row when it moves within a row).

- `GridRow` is `memo`ized. Its props are primitives plus TanStack's row object: `{ row, rowIndex, rowOffset, isSelected, activeCol, columnsKey }`. `activeCol` is `null` for every row but the active one, so only two rows see a changed prop. `columnsKey` (the visible column ids) re-renders every row when columns are shown or hidden.
- No per-cell handlers or inline callbacks: one `onKeyDown`, one `onClick`, one `onFocus` on the table, reading coordinates from data attributes. Cell props come from a pure `gridCellProps()`, not a hook.
- Cell renderers read a **narrow** context (`DataTableCellContext`: the selection, the label, `getRowLabel`), not the table context. The table context changes on every render, and context consumers skip `memo`, so a checkbox in every row would otherwise re-render on each move.
- Widget cells get their roving `tabIndex` from a per-cell context holding a primitive (`0` or `-1`), so only the two affected checkboxes re-render.
- **Row identity has to be stable.** TanStack's row objects are only stable while the `data` array is. The query layer's data is (structural sharing). A test harness that builds a new page object on each render makes every row "new", which the render-count test caught.

**Enforced by a test.** `useRenderCount(row.id)` is a dev-only counter: rows report each render to a `RenderCounterContext` callback that tests provide. Without a provider it does nothing, and in production builds the call is compiled out. `keyboard.test.tsx` moves the active cell down five times and asserts each move rendered exactly the two expected rows, and that a move within a row rendered one.

## Disabled controls stay focusable

A disabled element can't take focus, and in a roving tabindex the active cell's checkbox may be the grid's only Tab stop. So while a placeholder page is shown, the selection checkboxes are `aria-disabled` (styled as disabled, with their clicks ignored) rather than `disabled`. Otherwise, after a page change with the active cell in the selection column, the grid would have no Tab stop at all until the data settled.

## Testing

- **`gridNav` (table-driven):** every key from the four corners, the edges, the middle and the header (67 rows); clamping, `rowCount` 0, page steps larger than what's left, and out-of-range starting positions (18 rows); `clampPos` (6).
- **`toNavKey`:** plain keys, Ctrl and Cmd aliases, combos left to the browser, Alt, Shift and non-navigation keys (35 rows).
- **Persistence:** the pure rules (`activeCell.test.ts`), then the same rules through the real hook and URL: a page change, a sort, a sort from the header, a refetch clamp, a column visibility clamp, with focus left alone.
- **Roving tabindex:** exactly one `tabIndex={0}` in the grid, before and after navigating; every other checkbox and sort button is −1; Tab in, Tab out, Shift+Tab back.
- **Render count:** ≤ 2 rows per move (above).
- **Story** (real Chromium, keyboard only, axe in the default theme): Data/DataTable/Keyboard → Keyboard Only. Tab in from the toolbar and out to the pagination; every navigation key; Up into the Amount header, Enter to sort, Down back; Space, Shift+Space and Ctrl+A selection with `aria-selected` and the bulk bar; Next page from the pagination bar, Shift+Tab back to the first row in the same column, at `aria-rowindex` 52.

## Deviations from the APG

1. **Rows, not cells, are selected.** The APG data grid suggests Shift+Space to select a row and Ctrl+Space a column. The kit selects rows only, so plain Space toggles the row (no cell selection competes for it) and Shift+Space selects a range, like Shift+click. Ctrl+Space isn't bound.
2. **Shift+Space applies the row's new state to the range** (4b's rule): on an unselected row it selects the range, on a selected row it deselects it. The APG doesn't define ranges.
3. **Ctrl/Cmd+A selects the page, not "all".** Selection is page-by-page ([data-table.md](data-table.md#the-500-cap): "select all matching" was cut). Pressing it again clears the page.
4. **Widgets keep their own keys.** Space on a focused checkbox is the checkbox's (Shift+Space there is a range too); Space on a focused action button presses it. Space only toggles the row when the focus is on the cell itself. This matches the APG's guidance that a widget in a cell handles its own keys.
5. **The header row survives a view change.** The persistence rule says "row resets to 0", but a sort is a view change made from the header. Resetting would leave focus on the sort button while the grid thinks it's on the first row, and the next ArrowDown would skip a row.
6. **PageDown from the header** moves `pageStep` rows counted from the header row (to row 10 with step 10). PageUp from the header stays put.
7. **Not bound (yet):** Shift+Arrow range extension, Ctrl+Space, and Cmd+ArrowLeft/Right as Home/End aliases (on a Mac, Fn+Arrow already sends Home/End).
8. **A third delegated handler.** Besides `onKeyDown` and `onClick` there's `onFocus`, so focus that arrives without a key or click (a screen reader, a script) still updates the active cell.
9. **Truncated text by keyboard.** A truncated text cell's tooltip opens on hover only; focusing the cell doesn't show it. Screen readers get the full text either way. 5b's composite cells are the natural place to fix this.
