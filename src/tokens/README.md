# tokens

Design tokens and theming. The foundation every component builds on.

- `tokens.css`: CSS variables in two layers. **Palette** (`--palette-*`, raw values) and **semantic** (`--color-bg-surface`, `--color-fg-muted`, `--radius-md`, …). Light values on `:root`, dark overrides under `[data-theme="dark"]`.
- `tailwind-theme.css`: maps **only** the semantic tokens into Tailwind (`bg-surface`, `text-fg-muted`, `border-border`, `ring-focus-ring`). Default palettes are disabled, so raw classes like `bg-red-500` don't exist.
- `theme.ts`: `getTheme()`, `setTheme()`, `useTheme()`, `initTheme()`. Sets `data-theme` on `<html>`, follows the OS in `'system'` mode, persists to localStorage.
- `*.stories.tsx`: Foundations stories (the full tokens page arrives in Stage 2).

Components never reference `--palette-*` directly.
