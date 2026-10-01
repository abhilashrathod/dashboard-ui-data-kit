# lib

Small framework-agnostic utilities with no React or UI dependencies.

- `cn.ts`: `clsx` + `tailwind-merge` class-name composition.
- `api/`: the typed API client.
  - `client.ts`: `apiFetch()`. Validates every 2xx body against its contract, turns failures into `ApiError`, and rethrows cancellation (AbortError) unchanged.
  - `errors.ts`: `ApiError` and `isApiError()`.
  - `orders.ts`, `metrics.ts`: one typed function per endpoint, no React.
