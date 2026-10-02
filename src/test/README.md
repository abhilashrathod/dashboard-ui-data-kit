# test

Vitest test infrastructure for the `unit` project (jsdom).

- `setup.ts`: jest-dom matchers, MSW Node server lifecycle (`onUnhandledFrame: 'error'`), cleanup.
- `render.tsx`: `renderWithProviders()` with the app's providers: an in-memory URL (`url` option) and a fresh `createQueryClient({ mode: 'test' })` (no retries).
- `requestLog.ts`: `createRequestLog(server)` counts requests that reached MSW (`count`, `byPath`) and aborted fetch signals (`abortedCount`), for the "exactly N requests" tests.

Story tests run separately, in the `storybook` project (real Chromium), and need no setup here.

- `api.ts`: `api(path)` makes an absolute URL for plain `fetch` in tests (Node's fetch rejects relative URLs).

`setup.ts` also resets the mock db (fixed anchor `2026-09-30T00:00:00Z`) and the network config (latency off) before every test.

## Overlays: why behavior is tested in stories, not here

Radix overlays (dialog, menu, select, popover, tooltip, toast) depend on real layout, pointer events, focus management and animation events. jsdom implements none of these faithfully, so tests of focus trapping, keyboard navigation or typeahead here would test the polyfills, not the components.

- Overlay **behavior** (focus trap, Escape, focus return, arrow keys, typeahead, toasts appearing) is tested by **play functions** in the stories, which run in real Chromium (`storybook` Vitest project).
- **Unit tests** here cover logic only: the toast store, the announcer's scheduling, and ConfirmDialog's promise lifecycle.
- `setup.ts` adds just enough polyfills (ResizeObserver, pointer capture, scrollIntoView, matchMedia) for Radix to mount. It also turns Radix's "missing DialogTitle" console error into a failing test.
