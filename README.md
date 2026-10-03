# Dashboard UI Kit

A documented React kit for data-heavy dashboards: server-driven tables, URL-synced filters, real loading/empty/error states, and keyboard-accessible grids.

![Overview](docs/screenshots/overview-light.png)

**[Live demo]([DEMO_URL](https://dashboard-kit-demo-puce.vercel.app/))** · **[Storybook](STORYBOOK_URL)** · **[Loom walkthrough](LOOM_URL)**

The mock API runs in the browser (MSW). No backend is needed.

## Try it in 60 seconds

- **Overview → Orders.** On the [Overview]([DEMO_URL](https://dashboard-kit-demo-puce.vercel.app/)/), click a status in the donut. You land on Orders with that status already filtered, in one Back step.
- **Share a view.** Open [paid orders over $1,000, largest first]([DEMO_URL](https://dashboard-kit-demo-puce.vercel.app/)/?view=orders&orders.f=status:in:paid&orders.f=amount:gt:1000&orders.sort=-amount). Refresh it, or paste it in another tab. The same table comes back.
- **Break one widget.** Open **Demo** in the top bar and break only the KPIs, or open [`?fail=metrics.kpis`]([DEMO_URL](https://dashboard-kit-demo-puce.vercel.app/)/?fail=metrics.kpis). The KPIs fail with a Retry; the chart and table keep working.
- **Slow network.** Open [Orders on a slow network]([DEMO_URL](https://dashboard-kit-demo-puce.vercel.app/)/?view=orders&network=slow) and page through it. The old rows stay on screen (dimmed) until the next page lands. There's no skeleton flash.
- **Server validation.** On [Orders]([DEMO_URL](https://dashboard-kit-demo-puce.vercel.app/)/?view=orders), click **New order**, then **Use an existing reference (demo)**, then submit. The server's duplicate check comes back as an inline error on the Reference field.
- **Keyboard only.** On [Orders]([DEMO_URL](https://dashboard-kit-demo-puce.vercel.app/)/?view=orders), Tab into the table. Use the arrow keys to move, Space to select, and Enter to open an order. Press **?** for every shortcut.

| Dark mode                                             | Server error on a field                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| ![Overview, dark](docs/screenshots/overview-dark.png) | ![Server error on the Reference field](docs/screenshots/form-server-error.png) |

## The problem

Every client admin panel needs the same hard parts: big tables, filters that survive a refresh, honest loading and error states, and keyboard access. Most panels get them half right: the filters reset on Back, a failed refresh blanks the page, and the table is unusable without a mouse. I built this kit as a reusable foundation for those parts. My later projects (an order desk, a store, an AI SaaS app and an ops platform) build their admin screens on it.

## Architecture

```
  contracts (Zod: types, URL encoding, error codes)
        │
        ├──────────────► mock API (MSW: latency, failures, 10k orders)
        ▼                       ▲
  API client (fetch + contract checks)
        │
        ▼
  query layer (TanStack Query) ◄──── URL state (single source of truth)
        │                                   ▲
        ▼                                   │ setParams (user actions)
  DataState (loading · empty · no-results · error · ready)
        │                                   │
        ▼                                   │
  kit components (DataTable, DataBoundary, cards, charts)
        │                                   │
        ▼                                   │
  views (Overview, Orders) ─────────────────┘
```

### Folder map

| Folder                    | What's in it                                                                 |
| ------------------------- | ---------------------------------------------------------------------------- |
| `src/app/`                | The demo dashboard: shell, Overview and Orders views, widgets, Demo controls |
| `src/components/`         | The kit: one folder per component, each with stories and tests               |
| `src/contracts/`          | Zod schemas shared by the client and the mock server                         |
| `src/features/`           | Orders: columns, saved-view presets, row actions, drawers                    |
| `src/lib/`                | URL state, query layer, API client, data-state logic, forms, CSV             |
| `src/mocks/`              | MSW handlers, seeded data, network simulation                                |
| `src/tokens/`             | Design tokens: light/dark themes, density, contrast checks                   |
| `src/dev/`                | Storybook-only demos (URL bar, request log, mock API explorer)               |
| `src/hooks/`, `src/test/` | Shared hooks; test helpers and render wrappers                               |

### Built with

| Package                        | Why                                                                       |
| ------------------------------ | ------------------------------------------------------------------------- |
| React 19 + TypeScript + Vite   | Strict types end to end, fast dev server and builds.                      |
| Tailwind + CSS-variable tokens | Semantic classes only; light/dark and compact density are a token swap.   |
| TanStack Table v9              | Headless, in manual (server) mode: the server sorts and pages.            |
| TanStack Query                 | Cache, request cancellation, next-page prefetch, retry policy.            |
| TanStack Virtual               | Pages of up to 500 rows render only the visible window.                   |
| React Hook Form + Zod          | One schema validates the form and the server, with the same messages.     |
| Radix primitives               | Focus traps, dismissal and ARIA for overlays, without writing them again. |
| Recharts                       | Revenue and status charts.                                                |
| MSW                            | A realistic API in the browser, with latency, errors and empty data.      |
| class-variance-authority       | Typed component variants that other components can reuse.                 |
| Storybook                      | Docs, plus interaction and axe accessibility checks on every story.       |

## Hard problems

### 1. URL, cache and table state in sync

**The question:** How do the URL, the query cache and the table stay in sync without loops or double fetches?

**My answer:** The URL is the only copy of list state. Components read it through `useSyncExternalStore` and write it from event handlers; the table's sort and paging are derived from it on every render, never copied. The query key is the canonical encoding of the params, so a reordered link hits the same cache entry, and the layer's one layout effect only rewrites a messy URL to that spelling, once, with `replace`. Filters `push` history, typing `replace`s it, stale requests are cancelled and the next page is prefetched.

**See it:** [shared link]([DEMO_URL](https://dashboard-kit-demo-puce.vercel.app/)/?view=orders&orders.f=status:in:paid&orders.f=amount:gt:1000&orders.sort=-amount) · Storybook → [Data/URL ↔ Query](STORYBOOK_URL/?path=/story/data-url-query--default) (live request log) · [docs/url-state.md](docs/url-state.md)

![Orders filtered by status and amount, with the filters in the URL](docs/screenshots/orders-filters.png)

### 2. A flexible table API without 40 props

**The question:** How do you make a table flexible without it becoming a 40-prop monster?

**My answer:** `<DataTable>` takes three props, and features are child components: if you don't render `<DataTable.Search />`, there is no search. Column behavior (label, alignment, width, sort field, filter, CSV) lives once in typed column `meta`, and every part reads it from there. The table doesn't fetch; it renders a `source` handed to it. `table.instance` is the escape hatch to TanStack.

```tsx
const source = useOrdersTableData('orders') // URL params → query → DataState
const table = useDataTable({ id: 'orders', columns: orderColumns, source, selectable: true })

<DataTable table={table} aria-label="Orders">
  <DataTable.Toolbar>
    <DataTable.Search />
    <DataTable.Export slot="end" />
    <DataTable.DensityToggle slot="end" />
  </DataTable.Toolbar>
  <DataTable.Grid />
  <DataTable.Pagination />
  <DataTable.BulkBar>{(selection) => <BulkStatusAction selection={selection} />}</DataTable.BulkBar>
</DataTable>
```

**See it:** Storybook → [Data/DataTable](STORYBOOK_URL/?path=/story/data-datatable--default) · [docs/data-table.md](docs/data-table.md)

### 3. What loading, empty and error really mean

**The question:** What do loading, empty and error mean once real networks and filters are involved?

**My answer:** One pure function derives five states, and every widget renders them the same way. "No orders yet" and "No orders match these filters" are different states with different next steps, and a failed refresh keeps the data on screen, marked stale, with a Retry. Skeletons wait 150ms, then stay at least 300ms, so they never flicker. Each widget fails on its own, and after a successful Retry focus goes to the region instead of falling to the top of the page.

| State        | Meaning                             | The user sees                                              |
| ------------ | ----------------------------------- | ---------------------------------------------------------- |
| `loading`    | Nothing to show yet                 | A layout-matched skeleton (delayed)                        |
| `empty`      | The data set is empty               | "No orders yet"                                            |
| `no-results` | Filters exclude everything          | "No orders match these filters" + **Clear filters**        |
| `error`      | The request failed, nothing to show | The cause, **Retry**, the request ID                       |
| `ready`      | Data to show                        | Data, plus refetch bar / dimmed placeholder / stale banner |

**See it:** [KPIs failing]([DEMO_URL](https://dashboard-kit-demo-puce.vercel.app/)/?fail=metrics.kpis) · Storybook → [Data/States in practice → Partial Failure](STORYBOOK_URL/?path=/story/data-states-in-practice--partial-failure) · [docs/data-states.md](docs/data-states.md)

![The KPI cards in an error state while the chart and table still work](docs/screenshots/partial-failure.png)

### 4. Keyboard accessibility in data grids

**The question:** How do you make a sortable, selectable, paged and virtualized table fully usable by keyboard?

**My answer:** The table is an ARIA grid on native table elements with a roving tabindex: one Tab stop, and you come back to the cell you left. `aria-rowindex` is page-global, so a screen reader says "row 52 of 4,214" on page 2, matching the pagination bar. Under virtualization the focused row is always kept mounted, so focus never points at a row that isn't in the DOM. Focus only moves when the user moves it.

| Keys                      | Action                                                                         |
| ------------------------- | ------------------------------------------------------------------------------ |
| Tab / Shift+Tab           | Into or out of the table (one stop, back to the same cell)                     |
| ← → ↑ ↓                   | Move between cells; ↑ from the first row reaches the headers                   |
| Home / End, Ctrl+Home/End | Row start or end; first or last cell of the table                              |
| Page Up / Page Down       | Up or down 10 rows                                                             |
| Space, Shift+Space        | Select the row; select a range                                                 |
| Ctrl/⌘+A                  | Select every row on the page                                                   |
| Enter                     | Sort (on a header), open the order (on a cell), or step into a cell's controls |
| Esc / F2                  | Step back out of a cell's controls                                             |
| ?                         | Show every shortcut                                                            |

**See it:** [Orders]([DEMO_URL](https://dashboard-kit-demo-puce.vercel.app/)/?view=orders) · Storybook → [Data/DataTable/Keyboard → Keyboard Only](STORYBOOK_URL/?path=/story/data-datatable-keyboard--keyboard-only) · [docs/keyboard-grid.md](docs/keyboard-grid.md)

![Keyboard focus on a grid cell, with the active row tinted](docs/screenshots/keyboard-focus.png)

## Decisions & tradeoffs

- **Radix over hand-rolled overlays.** Focus traps, dismissal layers and focus return are easy to get subtly wrong; I style Radix instead of rewriting it.
- **Column visibility is a preference, not view state.** It lives in localStorage, so a link you share never hides the recipient's columns, and Back doesn't undo it.
- **A saved view is just a stored URL query.** There's no second state system that could drift from the URL; "which view am I on" is a string compare.
- **Bulk updates can partly succeed.** The server returns `{ updated, failed }`, and failed rows stay selected, ready to inspect or retry.
- **The server is the authority on status transitions.** The client doesn't pre-filter what "can" change, so a server rule change never becomes a client bug.
- **Two oranges, not one.** One bright orange can't be both a pleasant fill and readable text, so text and buttons use darker tokens that pass WCAG AA.
- **Virtualize only above 100 rows.** Rows outside the window aren't in the DOM, so the browser's Find can't see them; the usual page sizes (25–100) render every row.
- **CSV exports guard against formula injection.** A cell starting with `=`, `+`, `-` or `@` is prefixed with `'`, so a customer name can't run as a spreadsheet formula.

## What I cut and why

- **Select all matching / export all matching:** both need a server-side bulk or export job, and the mock API has neither.
- **Optimistic updates:** bulk changes can partly succeed, so a rollback would have to be per row, across every cached page. That's a lot of complexity for ~300ms.
- **Multi-sort:** one sort covers most admin lists and keeps the URL and the header states simple.
- **Multi-currency:** amounts are one currency; doing it properly means per-row currency and conversion rules.
- **A real backend:** MSW keeps the demo free to host while still exercising latency, errors and validation.
- **A drag-and-drop dashboard builder:** a product in its own right, not a kit component.
- **A theming engine beyond tokens + dark mode:** the two token layers already cover rebranding.
- **Some grid keys:** Shift+Arrow range extension and Ctrl+Space column selection aren't bound; selection is by row.

## Run locally

Requires Node 22 (`nvm use`) and pnpm.

```sh
pnpm install
pnpm dev         # demo app, http://localhost:5173
pnpm storybook   # Storybook, http://localhost:6006
```
