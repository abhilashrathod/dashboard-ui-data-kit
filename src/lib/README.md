# lib

Small utilities with no UI dependencies. Only `data-state/`, `url-state/` and `query/` touch React, through small hooks.

- `cn.ts`: `clsx` + `tailwind-merge` class-name composition.
- `api/`: the typed API client.
  - `client.ts`: `apiFetch()`. Validates every 2xx body against its contract, turns failures into `ApiError`, and rethrows cancellation (AbortError) unchanged.
  - `errors.ts`: `ApiError` and `isApiError()`.
  - `orders.ts`, `metrics.ts`: one typed function per endpoint, no React.
- `format.ts`: cached Intl formatters (currency, number, percent, date, relative time). en-US and USD only.
- `merge-refs.ts`: combine several React refs into one.
- `data-state/`: the DataState model (see [docs/data-states.md](../../docs/data-states.md)).
  - `types.ts`: `DataState<T>` and the exhaustive `matchDataState()`.
  - `toDataState.ts`: the pure derivation from a TanStack Query result, with its precedence rules.
  - `useDataState.ts` (memoizes it), `useDelayedFlag.ts` (anti-flicker timing).
- `url-state/`: the URL-as-state store (see [docs/url-state.md](../../docs/url-state.md)).
  - `adapter.ts`: the `UrlAdapter` interface, the browser adapter and an in-memory one for tests and Storybook.
  - `namespace.ts`: pure helpers. Read/write one namespace's slice of the query string, per-list defaults, and the page-reset rule (`applyParamsUpdate`).
  - `useListParams.ts`: params from the URL, `setParams` / `resetParams`, and canonicalize-on-load (the layer's only effect).
  - `listParamsActions.ts`: pure updaters (`setSort`, `setPage`, `upsertFilter`, …) for `setParams`.
  - `UrlStateProvider.tsx`, `context.ts`: supply the adapter (browser by default).
- `query/`: the query layer on top of the URL store (see [docs/url-state.md](../../docs/url-state.md#the-query-half)).
  - `queryClient.ts`: `createQueryClient({ mode })` and the pure `shouldRetry` policy.
  - `keys.ts`: `queryKeys`, the hierarchical key factory (list keys use the canonical params string).
  - `useOrdersList.ts`: one list page, keepPreviousData, cancellation, and the next-page prefetch (the layer's only effect).
  - `useMetrics.ts`, `mutations.ts`: KPIs, revenue, create order and bulk status (invalidate on settle, no optimistic updates).
  - `useOrdersTableData.ts`: URL params → list query → DataState, for the Stage 4 table.
