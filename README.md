# Dashboard UI Kit

A documented React component library for data-heavy dashboards, built and documented in Storybook. Every component sits on a two-layer design token system with light and dark themes, is tested through its stories (interaction and accessibility checks run in CI), and is exercised in a demo dashboard that runs against a Mock Service Worker API, with no backend required.

- Storybook: <vercel-url>
- Demo: <vercel-url>

**Status: Stage 0** (scaffold, tokens, MSW, Storybook, CI)

## Development

Requires Node 22 (`nvm use`) and pnpm.

```sh
pnpm install
pnpm dev              # demo app, http://localhost:5173
pnpm storybook        # Storybook, http://localhost:6006
pnpm test             # unit tests + Storybook story tests
```

Story tests run in headless Chromium. Install it once with `pnpm exec playwright install chromium`.
