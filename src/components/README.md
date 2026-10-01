# components

The kit's reusable components, one folder per component (component, stories, tests side by side).

Rules:

- Style with semantic token classes only (`bg-surface`, `text-fg-muted`, …), never palette values.
- Compose class names with `cn()` from `@/lib/cn`.
- Every component ships a story; stories double as tests (play functions + a11y checks run in `pnpm test`).

Empty in Stage 0. The data table, filters, charts and forms arrive in later stages.
