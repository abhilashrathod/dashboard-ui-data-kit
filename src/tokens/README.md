# tokens

Design tokens and theming. The foundation every component builds on. Principles: [docs/design-direction.md](../../docs/design-direction.md).

- `tokens.ts`: the **manifest**, the source of truth for token names, groups and descriptions. It drives the Foundations/Tokens page and the guard tests.
- `tokens.css`: the **values**. Theme-independent tokens on `:root`, light on `:root, [data-theme='light']`, dark on `[data-theme='dark']`, and density on `[data-density]`.
- `tailwind-theme.css`: maps **only** the semantic tokens into Tailwind (`bg-surface-subtle`, `text-fg-muted`, `bg-accent-solid`, `rounded-pill`, `h-control-md`, `text-display`, …), plus the `bg-gradient-accent`, `focus-ring` and `tabular` utilities. The default palette is disabled, and ESLint rejects raw classes like `bg-orange-500`.
- `contrast.ts`: the WCAG contrast math and `CONTRAST_PAIRS`, every pair the kit guarantees.
- `patterns.tsx`: `<HatchPattern id />`, the SVG hatch fill for secondary chart series.
- `theme.ts`: `getTheme()`, `setTheme()`, `useTheme()`, `initTheme()`. Sets `data-theme` on `<html>`, follows the OS in `'system'` mode, and persists the choice.
- `density.ts`: `getDensity()`, `setDensity()`, `useDensity()`, `initDensity()`. Sets `data-density` on `<html>` and persists it. Any element can set `data-density` itself to override it for its subtree.
- `__tests__/`: the drift test (manifest ↔ CSS) and the contrast test (`*.node.test.ts`, run in Node), plus the theme and density tests.
- `TokensPage.tsx` / `*.stories.tsx`: the Foundations stories.
