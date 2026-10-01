# mocks

Mock Service Worker (MSW 3): the demo's only backend.

- `handlers.ts`: the shared request handlers, used everywhere.
- `browser.ts`: the service worker for the demo app and Storybook. The script is copied from `public/` to the root of both builds and served at `/mockServiceWorker.js`.
- `node.ts`: the Node server used by Vitest (`src/test/setup.ts`).

Later stages add seed data and network-mode controls (latency, errors, offline) here.

Note: MSW 3 renamed `onUnhandledRequest` to `onUnhandledFrame`. The old key is silently ignored.
