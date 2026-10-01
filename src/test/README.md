# test

Vitest test infrastructure for the `unit` project (jsdom).

- `setup.ts`: jest-dom matchers, MSW Node server lifecycle (`onUnhandledFrame: 'error'`), cleanup.
- `render.tsx`: `renderWithProviders()` with a fresh, non-retrying QueryClient.

Story tests run separately, in the `storybook` project (real Chromium), and need no setup here.

- `api.ts`: `api(path)` makes an absolute URL for plain `fetch` in tests (Node's fetch rejects relative URLs).

`setup.ts` also resets the mock db (fixed anchor `2026-09-30T00:00:00Z`) and the network config (latency off) before every test.
