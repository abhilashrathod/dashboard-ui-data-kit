# components

The kit's reusable components, one folder per component (component, stories, tests side by side).

Rules:

- Style with semantic token classes only (`bg-surface`, `text-fg-muted`, …), never palette values. Raw Tailwind palette classes (`bg-orange-500`) generate no CSS and fail lint.
- Controls are pills (`rounded-pill`, `h-control-*`), keyboard focus uses the `focus-ring` utility, and numbers use `tabular`. See [docs/design-direction.md](../../docs/design-direction.md).
- Compose class names with `cn()` from `@/lib/cn`.
- Every component ships a story; stories double as tests (play functions + a11y checks run in `pnpm test`).

Empty so far. The data table, filters, charts and forms arrive in later stages.
