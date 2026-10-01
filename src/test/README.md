# test

Vitest test infrastructure for the `unit` project (jsdom).

- `setup.ts`: jest-dom matchers, MSW Node server lifecycle (`onUnhandledFrame: 'error'`), cleanup.
- `render.tsx`: `renderWithProviders()` with a fresh, non-retrying QueryClient.

Story tests run separately, in the `storybook` project (real Chromium), and need no setup here.
