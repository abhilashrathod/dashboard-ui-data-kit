# Design direction

A warm, soft, rounded dashboard: orange and near-black on a warm off-white canvas. The look borrows from polished "Dribbble" dashboards, but every color pair is tested against WCAG AA in both themes.

## Principles

- **Tone over borders.** Depth comes from four surface steps: `canvas`, `surface`, `surface-subtle` and `surface-muted`. A card is a white shape on the off-white canvas, with no border or shadow. A nested tile is one step darker than its card. Borders are for hairline dividers and outline controls only, and shadows (`shadow-overlay`) are for things that float, such as menus, popovers and dialogs.
- **Pills for controls, large radii for containers.** Every button, input, select, chip and icon button is a full pill (`rounded-pill`). Cards use `rounded-lg` (24px), nested tiles `rounded-md` (16px), and the app shell `rounded-xl` (32px).
- **The two-orange rule.** `accent` is the brand orange, for large fills, chart series, decorative glyphs and the focus ring. It is too light for small text. `accent-solid` is a darker orange for buttons with text on them, and `accent-text` is for small orange text such as links. If text sits on orange or is orange, use the `-solid` or `-text` token.
- **One hero per screen.** The gradient card (`bg-gradient-accent`) marks the single most important number. It carries only large display text (white passes 3:1 there, not 4.5:1). Small labels on it sit in a surface pill.
- **Big, light numbers.** KPIs use `text-display` / `text-display-sm`: weight 400, tracking -0.02em, and `tabular` digits so values don't shift as they change. Only three weights exist: 400, 500 and 600.
- **Hatch for secondary series.** "Previous period" and "pending" series use a diagonal hatch (`<HatchPattern />`) instead of a second color, so the distinction never depends on color alone.
- **Density modes.** `data-density="compact"` on any element shrinks row height (52 → 40px) and control heights for everything inside it. Comfortable is the default.

## Where we deviate from typical "Dribbble" dashboards, and why

- **Muted text is darker than it looks in mockups.** Pale gray labels on white usually sit near 3:1. `fg-muted` passes 4.5:1 on both `surface` and `surface-subtle`. `fg-subtle` (3:1) is only for placeholders and decorative text.
- **Two oranges, not one.** A single bright orange can't be both a pleasant fill and readable text or a button background with white text. That is why the accent is split into `accent` and `accent-solid` / `accent-text`.
- **The gradient is darker at its light end.** The usual peach-to-orange gradient puts white text at about 2.5:1. The light stop was darkened until white passes 3:1 for large text.
- **Chart colors are pinned to the same contrast band.** Every series color is at least 3:1 against the card, so pastel series are out. As a result, light-mode chart-3 and chart-4 are close in lightness to chart-1, so series must also be separated by position, labels or hatching, never by color alone.
- **Visible focus everywhere.** A 2px orange outline with a 2px offset, `:focus-visible` only, at least 3:1 against both the card and the canvas.
- **Reduced motion is respected.** Under `prefers-reduced-motion: reduce`, durations become 0ms.
- **Input outlines (decided in Stage 2b).** At rest, an `Input` is a surface-subtle pill with no ≥3:1 edge. It's identified by its required label, its placeholder and its icon instead (see [component-conventions.md](component-conventions.md)). The edge (`border-strong`) and the focus ring appear on hover and focus, and invalid inputs get a `status-danger` edge (4.3:1). If an audit requires a resting 3:1 boundary, switch the resting border to `fg-subtle`.

## How to add a token

1. **Manifest.** Add an entry to `TOKENS` in `src/tokens/tokens.ts`, with group, name, description, optional usage, and `scope` (`'theme'` if the value differs per theme, `'global'` if not).
2. **CSS.** Define the value in `src/tokens/tokens.css`. A themed token goes in both the light block (`:root, [data-theme='light']`) and the dark block, and so does an alias such as `var(--color-accent)`, because a `var()` resolves where it is declared. A global token goes in the first `:root` block.
3. **Tailwind (if components use it as a class).** Map it in `src/tokens/tailwind-theme.css`. If the class name is new to tailwind-merge (a size, radius or shadow name), register it in `src/lib/cn.ts`.
4. **Contrast.** If it is a text or UI color, add its pairs to `CONTRAST_PAIRS` in `src/tokens/contrast.ts`.
5. **Run `pnpm test`.** The drift test fails if the manifest and CSS disagree, and the contrast test prints every ratio. The Foundations/Tokens story picks the token up automatically.
