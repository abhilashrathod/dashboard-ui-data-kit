# mocks

Mock Service Worker (MSW 3): the demo's only backend.

- `handlers.ts`: the shared request handlers, used everywhere.
- `browser.ts`: the service worker for the demo app and Storybook. The worker URL is built from `import.meta.env.BASE_URL` so it resolves under the GitHub Pages subpath.
- `node.ts`: the Node server used by Vitest (`src/test/setup.ts`).

Later stages add seed data and network-mode controls (latency, errors, offline) here.

Note: MSW 3 renamed `onUnhandledRequest` to `onUnhandledFrame`. The old key is silently ignored.
