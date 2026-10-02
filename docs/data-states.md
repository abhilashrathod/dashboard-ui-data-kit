# Data states

Every data component in the kit (the table, KPI cards, charts) renders the same five states, derived the same way, by one pure function. This page explains the model and the decisions behind it.

- **Type and matcher:** [`src/lib/data-state/types.ts`](../src/lib/data-state/types.ts)
- **Derivation:** [`src/lib/data-state/toDataState.ts`](../src/lib/data-state/toDataState.ts)
- **Rendering:** [`src/components/data-state/DataBoundary.tsx`](../src/components/data-state/DataBoundary.tsx)
- **Usage examples:** [`src/dev/data-state-demo/`](../src/dev/data-state-demo/), shown in Storybook under **Data/States in practice**

## The taxonomy

| Status       | Meaning                                        | What the user sees                                             |
| ------------ | ---------------------------------------------- | -------------------------------------------------------------- |
| `loading`    | Nothing to show yet                            | A skeleton that mirrors the final layout (delayed; see below)  |
| `empty`      | The data set itself is empty                   | "No orders yet", with an optional next step                    |
| `no-results` | Data exists, but the filters exclude all of it | "No orders match these filters" + **Clear filters**            |
| `error`      | Nothing to show, because the request failed    | What went wrong (by error code), **Retry**, and the request ID |
| `ready`      | Data to show                                   | The data, plus any of the flags below                          |

`ready` carries three flags that change the presentation, not the content:

- **`isRefetching`**: a background fetch is in flight. A 2px bar runs along the top edge.
- **`isPlaceholder`**: these are the previous key's results while the new key loads (`placeholderData: keepPreviousData`). The content turns grayscale.
- **`staleError`**: the last refresh failed, so the data on screen is older. A banner reads "Couldn't refresh · showing data from 2 minutes ago", with a Retry.

`matchDataState(state, { loading, empty, noResults, error, ready })` branches exhaustively. Every handler is required, and a `never` check means that adding a status breaks the compile everywhere it isn't handled.

## The precedence rules

`toDataState(query, { isEmpty, isFiltered?, clear? })` applies these in order; the first match wins:

1. `data === undefined && isError` → **error**. (Non-ApiError errors are normalized to `ApiError { status: 0, code: 'UNAVAILABLE' }`.)
2. `data === undefined` → **loading**.
3. `isEmpty(data) && isError` → **error**. An empty list we couldn't refresh is not proof of "no data"; don't claim "no orders".
4. `isEmpty(data) && isPlaceholderData` → **loading**. The previous key's empty result shouldn't flash "no results" for the new key.
5. `isEmpty(data)` → `isFiltered` ? **no-results** (with `clear`) : **empty**.
6. Otherwise → **ready**, with `isRefetching = isFetching`, `isPlaceholder = isPlaceholderData`, `staleError = isError ? error : undefined`, `updatedAt = dataUpdatedAt`, and `retry = () => refetch()`.

The function is pure, and every rule and precedence edge has a row in a table-driven test ([`toDataState.test.ts`](../src/lib/data-state/__tests__/toDataState.test.ts)). `useDataState` only memoizes it.

## Why empty and no-results are different states

They look alike (nothing to show), but they mean different things and need different next steps:

- **Empty** says something about the data: there are no orders. The next step is to create one, or to wait.
- **No results** says something about the user's view: their filters excluded everything. The next step is to loosen the filters, so the state carries `clear` and the UI offers **Clear filters**.

Telling a user with 10,000 orders that there are "No orders yet" is a bug, and so is offering "Clear filters" when nothing is filtered. `isFiltered` makes the caller say which case applies, because only the caller knows.

## Stale-while-error

Once data is on screen, a failed refresh doesn't take it away. The data stays, marked stale with when it's from, and a Retry is offered. Replacing a useful, slightly old dashboard with an error screen because one background refresh failed would punish the user for a network blip.

The exception is rule 3. If the data on screen is empty and the refresh failed, we don't know whether it's still empty, so we show the error instead of claiming "no orders".

## Anti-flicker timings

`useDelayedFlag(active, { delay: 150, minDuration: 300 })` gates the skeleton and the refetch bar:

- **150ms delay.** A response faster than this never shows a skeleton at all. Below roughly 150ms, a skeleton reads as a flicker, not as feedback. Until then, the boundary lays the skeleton out invisibly, so the space is reserved and nothing jumps.
- **300ms minimum.** Once the skeleton is visible, it stays at least 300ms, even if the data arrives sooner. Without this, a response at 160ms would flash a skeleton for 10ms, which is worse than no skeleton.

In Storybook's normal network mode (150–600ms latency), measured skeletons were visible for 301–451ms; in slow mode, until the data arrived.

## Retry and focus

**Retry keeps the error on screen.** In TanStack Query v5, refetching a query that has an error and no data resets it to `pending`, so pressing Retry gives error → loading → ready. `toDataState` reports that faithfully (rule 2: loading). But showing the skeleton there would unmount the Retry button the user just pressed. So `DataBoundary` remembers the last error and keeps showing it, with a busy Retry button, until the reload settles. If the retry fails, "Orders failed to load" is announced again: the user pressed Retry and needs to hear the outcome.

**Focus after a successful retry goes to the region.** When the data arrives, the error UI, and the focused Retry button with it, unmounts. The browser then drops focus to `<body>`, and a keyboard user would have to Tab from the top of the page to get back. So if focus was inside the boundary at that moment, the boundary moves it to its own `<section>` (`tabIndex={-1}`, named by `label`). Screen readers announce the region, and the next Tab continues from where the user was. If focus was elsewhere, it's left alone.

## Announcements, and why ErrorState doesn't use role="alert"

A dashboard can have several widgets fail at once, for example when the network drops. If each error UI were `role="alert"`, every failure would interrupt the screen reader, one after another. Instead, `DataBoundary` announces politely through the shared announcer, and only on transitions:

- entering error: "Orders failed to load"
- error → ready: "Orders loaded"
- entering stale: "Orders couldn't refresh"

Ordinary loads and refetches are not announced. They're expected, and announcing them would be noise. `aria-busy` on the region covers "this is updating".

## Wiring a new widget

```tsx
const isEmpty = (r: RevenueSeriesResponse) => r.points.every((p) => p.orders === 0)

function RevenueWidget({ range }: { range: MetricsRange }) {
  const query = useQuery({
    queryKey: ['metrics', 'revenue', range],
    queryFn: ({ signal }) => fetchRevenueSeries(range, signal),
  })
  const state = useDataState(query, { isEmpty })

  return (
    <Card>
      <Card.Title>Revenue</Card.Title>
      <DataBoundary state={state} label="Revenue" skeleton={<Skeleton className="h-10 w-44" />}>
        {(series) => <Amount size="display-sm" value={sum(series.points)} />}
      </DataBoundary>
    </Card>
  )
}
```

- Define `isEmpty` outside the component (or memoize it), so `useDataState` can memoize. Pass `isFiltered` and `clear` when the widget has filters.
- The `skeleton` should match the final layout's size. The `label` must be unique on the page, because each boundary is a named region.
- Examples: [OrdersCountWidget](../src/dev/data-state-demo/OrdersCountWidget.tsx) (the minimal case), [KpiListWidget](../src/dev/data-state-demo/KpiListWidget.tsx) (compact size, custom empty), [RevenueTotalWidget](../src/dev/data-state-demo/RevenueTotalWidget.tsx) (derives a value), [FilteredOrdersWidget](../src/dev/data-state-demo/FilteredOrdersWidget.tsx) (filters, no-results, `keepPreviousData`).

## Two deliberate details

- **Placeholder data is grayscale, not faded.** Fading fails contrast: muted text on a tile is 5.14:1, and drops to 2.00 at 50% opacity and 4.16 even at 90%. Grayscale keeps luminance, so contrast holds, while drained colour still reads as "not the current result". The refetch bar runs on top.
- **Error copy lives in one map.** `ERROR_COPY` covers every `ApiError` code, and `Record<ApiErrorCode, …>` makes a new code a compile error until it has copy.
