# lib

Small utilities with no UI dependencies. Only `data-state/` touches React, and only through two small hooks.

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
