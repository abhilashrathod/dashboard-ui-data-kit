# Component conventions

Rules every component in `src/components` follows. `Button` is the reference implementation. Visual principles live in [design-direction.md](design-direction.md).

## Structure

- One folder per component: `src/components/<name>/{<Name>.tsx, <Name>.stories.tsx, <Name>.test.tsx, index.ts}`. Related compositions can share a folder (`SearchInput` lives in `input/`, `SkeletonText` in `skeleton/`).
- `index.ts` re-exports the public API. `src/components/index.ts` is the barrel.
- Formatting helpers that aren't components go in `src/lib` (e.g. `src/lib/format.ts`).

## Styling

- **Semantic token classes only**: `bg-surface-subtle`, `text-fg-muted`, `rounded-pill`. Never raw palette classes (ESLint rejects them) or hex values.
- **Variants use [cva](https://cva.style) + `cn()`.** Each component exports its variants function (`buttonVariants`, `badgeVariants`, …), so other components can reuse the styles. For example, `IconButton` is `buttonVariants()` plus a square size.
- **`className` merges last**, through `cn()`, so callers can override anything.
- **No outer margin.** Layout belongs to the parent (`gap-*`, `space-*`).
- **Sizes come from the density tokens** (`h-control-sm|md|lg`, `size-control-*`), so `data-density="compact"` shrinks every control automatically.
- **State is exposed as data attributes** (`data-state`, `data-loading`, `data-invalid`, `data-disabled`) and styled from them (`data-loading:…`). Tests and parents can rely on these attributes.
  - Exception: `Checkbox` styles from the native `:checked` / `:indeterminate` pseudo-classes, so uncontrolled checkboxes work without React knowing their state.
- **Hover uses the `hover-enabled:` variant.** It matches only on devices with hover, and never on `:disabled`, `[data-disabled]`, `[data-loading]` or `[aria-disabled=true]`, so a disabled control never changes on hover.
- **Neutral fills hover with a state layer**: a `::before` overlay of `--color-fg` at low opacity. It darkens in light mode and lightens in dark mode without needing an extra token. Primary and accent use their dedicated `-hover` tokens.

## API

- **React 19: `ref` is a regular prop.** No `forwardRef`.
- **Spread the remaining native props onto the root element.** Type them as `ComponentProps<'button'>` etc., minus anything the component redefines.
  - Exception: `Input` and `Checkbox` spread onto the native `<input>`, and their ref points at it, because that's the element callers need to reach. `className` still goes on the visual root.
- **Prop budget: about 8 props** of our own per component. Beyond that, compose (`Card.Header`, `SearchInput`) or split.
- **Compound parts are thin.** `Card.Header`, `Card.Title`, etc. are styled native elements with no hidden state.

## Accessibility

- **Every interactive element uses the `focus-ring` utility** (or `focus-ring-within` on a wrapper whose `<input>` takes focus) and works by keyboard. Prefer native elements (`<button>`, `<input type="checkbox">`) over ARIA re-creations.
- **The types enforce accessible names where they can.** `IconButton` requires `aria-label` or `aria-labelledby`, and so does `Checkbox` when it has no `label`.
- **Never color alone.** Status shows a visible label, deltas show an arrow and a sign, and invalid inputs need visible error text from the caller (`invalid` only sets the red edge and `aria-invalid`).
- **Busy is not disabled.** A loading `Button` keeps focus and its width. It sets `aria-busy` and `aria-disabled`, and swallows clicks, instead of using `disabled`, which would drop keyboard focus to `<body>`.
- **Hit areas are at least 24×24px**, even when the visual is smaller (`Checkbox`).
- **Motion uses the motion tokens** and respects `prefers-reduced-motion`.
- **Text inputs are identified by their label, placeholder and adornments**, not by a ≥3:1 boundary. At rest, the pill is a tone step (surface-subtle). Every `Input` must have a visible label or an `aria-label`, plus a placeholder or icon. This is a deliberate reading of WCAG 1.4.11. If an audit disagrees, switch the resting border to `border-fg-subtle` (3:1).

## Stories and tests

- **One story file per component**, with `tags: ['autodocs']`. Each has:
  - a **Playground** (args and controls);
  - an **All variants** grid, wrapped in `<StoryMatrix>`, which renders it in light/dark × comfortable/compact, so the axe check covers all four combinations;
  - a docs description with **Do / Don't** notes.
- **Play functions test behavior in a real browser.** Unit tests (Vitest + Testing Library, jsdom) cover logic, types and DOM contracts.
- **Type-level guarantees get a `@ts-expect-error` test.** `pnpm typecheck` fails if the error disappears.
