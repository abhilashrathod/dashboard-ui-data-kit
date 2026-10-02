# components

The kit's reusable components, one folder per component (component, stories, tests side by side).

Rules:

- Style with semantic token classes only (`bg-surface`, `text-fg-muted`, …), never palette values. Raw Tailwind palette classes (`bg-orange-500`) generate no CSS and fail lint.
- Controls are pills (`rounded-pill`, `h-control-*`), keyboard focus uses the `focus-ring` utility, and numbers use `tabular`. See [docs/design-direction.md](../../docs/design-direction.md).
- Compose class names with `cn()` from `@/lib/cn`.
- Every component ships a story; stories double as tests (play functions + a11y checks run in `pnpm test`).

Conventions: [docs/component-conventions.md](../../docs/component-conventions.md). Import from the barrel: `import { Button, Card } from '@/components'`.

- Actions: `Button`, `IconButton`
- Inputs: `Input`, `SearchInput`, `Checkbox`
- Display: `Badge`, `StatusPill`, `DeltaChip`, `Amount`, `Card`
- Feedback: `Spinner`, `Skeleton`, `SkeletonText`, `VisuallyHidden`
- Overlays (Radix): `Popover`, `DropdownMenu`, `Select`, `Dialog`, `ConfirmDialog`, `Drawer`, `Tooltip`, `TruncatedText`
- App-wide: `KitProvider` (render once at the root), `useToast()`, `useAnnounce()`
- `overlay/styles.ts`: the shared panel, motion, backdrop and menu-row styles

The data table, filters, charts and forms come later.
