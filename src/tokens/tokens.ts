/*
 * Token manifest: the source of truth for token NAMES and docs. Values live in
 * ./tokens.css. The drift test (tokens.node.test.ts) fails if the two disagree,
 * and the Foundations/Tokens page renders from this list.
 */

export const TOKEN_GROUPS = [
  'Surface',
  'Text',
  'Border',
  'Action',
  'Accent',
  'Status',
  'Chart',
  'Focus',
  'Radius',
  'Shadow',
  'Spacing',
  'Typography',
  'Density',
  'Motion',
] as const

export type TokenGroup = (typeof TOKEN_GROUPS)[number]

export interface Token {
  group: TokenGroup
  /** The CSS custom property, e.g. `--color-surface`. */
  name: `--${string}`
  description: string
  /** Where to use it (Tailwind class or rule of thumb). */
  usage?: string
  /**
   * 'theme': defined in both the light and dark blocks.
   * 'global': theme-independent, defined once on :root.
   */
  scope: 'theme' | 'global'
}

type Entry = Omit<Token, 'group' | 'scope'>

const perTheme = (group: TokenGroup, entries: Entry[]): Token[] =>
  entries.map((entry) => ({ ...entry, group, scope: 'theme' }))

const shared = (group: TokenGroup, entries: Entry[]): Token[] =>
  entries.map((entry) => ({ ...entry, group, scope: 'global' }))

const STATUSES = ['success', 'warning', 'danger', 'info', 'neutral'] as const

const TYPE_SCALE = [
  ['xs', '12/16'],
  ['sm', '13/18'],
  ['base', '14/20, the dashboard body size'],
  ['md', '16/24'],
  ['lg', '18/26'],
  ['xl', '22/28'],
  ['2xl', '28/34'],
  ['display-sm', '36/40, weight 400, tracking -0.02em'],
  ['display', '48/52, weight 400, tracking -0.02em'],
] as const

export const TOKENS: Token[] = [
  ...perTheme('Surface', [
    { name: '--color-canvas', description: 'App background behind cards.', usage: 'bg-canvas' },
    { name: '--color-surface', description: 'Cards and panels.', usage: 'bg-surface' },
    {
      name: '--color-surface-subtle',
      description: 'One step in from surface: nested tiles, table headers, inputs.',
      usage: 'bg-surface-subtle',
    },
    {
      name: '--color-surface-muted',
      description: 'Hover fills and the secondary pill background.',
      usage: 'bg-surface-muted',
    },
    {
      name: '--color-surface-inverse',
      description: 'Inverted cards such as tooltips.',
      usage: 'bg-surface-inverse + text-fg-inverse',
    },
  ]),

  ...perTheme('Text', [
    { name: '--color-fg', description: 'Primary text and icons.', usage: 'text-fg' },
    {
      name: '--color-fg-muted',
      description: 'Labels and secondary text. AA (4.5:1) on surface and surface-subtle.',
      usage: 'text-fg-muted',
    },
    {
      name: '--color-fg-subtle',
      description:
        'Placeholders and decorative text only (3:1). Never for text a user needs to read.',
      usage: 'text-fg-subtle',
    },
    {
      name: '--color-fg-inverse',
      description: 'Text on surface-inverse.',
      usage: 'text-fg-inverse',
    },
  ]),

  ...perTheme('Border', [
    {
      name: '--color-border',
      description: 'Hairline dividers. Prefer a tone step over a border.',
      usage: 'border-border',
    },
    {
      name: '--color-border-strong',
      description: 'Outline pills and input outlines.',
      usage: 'border-border-strong',
    },
  ]),

  ...perTheme('Action', [
    { name: '--color-ink', description: 'Primary button background.', usage: 'bg-ink' },
    {
      name: '--color-ink-hover',
      description: 'Primary button hover.',
      usage: 'hover:bg-ink-hover',
    },
    { name: '--color-ink-fg', description: 'Text on ink.', usage: 'text-ink-fg' },
  ]),

  ...perTheme('Accent', [
    {
      name: '--color-accent',
      description:
        'Brand orange for large fills, charts, decorative glyphs and focus. Not for small text.',
      usage: 'bg-accent, text-accent (≥24px glyphs only)',
    },
    {
      name: '--color-accent-solid',
      description: 'Orange button background (darker in light mode so text on it passes AA).',
      usage: 'bg-accent-solid',
    },
    {
      name: '--color-accent-solid-hover',
      description: 'Orange button hover.',
      usage: 'hover:bg-accent-solid-hover',
    },
    {
      name: '--color-accent-solid-fg',
      description: 'Text on accent-solid (4.5:1).',
      usage: 'text-accent-solid-fg',
    },
    {
      name: '--color-accent-text',
      description: 'Small orange text on surface (4.5:1), e.g. links.',
      usage: 'text-accent-text',
    },
    {
      name: '--color-accent-subtle',
      description: 'Orange tint: selected rows, chips.',
      usage: 'bg-accent-subtle',
    },
    {
      name: '--color-accent-subtle-fg',
      description: 'Text on accent-subtle (4.5:1).',
      usage: 'text-accent-subtle-fg',
    },
    {
      name: '--color-accent-gradient-from',
      description: 'Light stop of the hero gradient. White passes 3:1 (large text).',
    },
    {
      name: '--color-accent-gradient-to',
      description: 'Dark stop of the hero gradient. White passes 3:1, not 4.5:1.',
    },
    {
      name: '--color-accent-gradient-fg',
      description:
        'Large (≥24px) display text on the hero gradient. Small text goes in a surface pill.',
      usage: 'text-accent-gradient-fg',
    },
    {
      name: '--gradient-accent',
      description: 'Hero KPI card background. One hero per screen.',
      usage: 'bg-gradient-accent',
    },
  ]),

  ...STATUSES.flatMap((status) =>
    perTheme('Status', [
      {
        name: `--color-status-${status}`,
        description: `${status}: dots, icons, chart marks (3:1 on surface).`,
        usage: `bg-status-${status}`,
      },
      {
        name: `--color-status-${status}-subtle`,
        description: `${status}: tinted pill or banner background.`,
        usage: `bg-status-${status}-subtle`,
      },
      {
        name: `--color-status-${status}-fg`,
        description: `${status}: text on the subtle background (4.5:1).`,
        usage: `text-status-${status}-fg`,
      },
    ]),
  ),

  ...perTheme('Chart', [
    { name: '--color-chart-1', description: 'Primary series (= accent).', usage: 'chart-1' },
    {
      name: '--color-chart-2',
      description: 'Second series (ink). 3:1 against chart-1.',
      usage: 'chart-2',
    },
    { name: '--color-chart-3', description: 'Third series.', usage: 'chart-3' },
    { name: '--color-chart-4', description: 'Fourth series (warm gray).', usage: 'chart-4' },
    { name: '--color-chart-grid', description: 'Grid lines and axes (= border).' },
    {
      name: '--color-chart-hatch-fg',
      description: 'Hatch stripes for previous-period / pending series.',
      usage: '<HatchPattern />',
    },
    {
      name: '--color-chart-hatch-bg',
      description: 'Fill between hatch stripes.',
      usage: '<HatchPattern />',
    },
  ]),

  ...perTheme('Focus', [
    {
      name: '--color-focus-ring',
      description: 'Keyboard focus outline (= accent). 3:1 on surface and canvas.',
      usage: 'focus-ring',
    },
  ]),
  ...shared('Focus', [
    { name: '--focus-ring-width', description: 'Focus outline width.' },
    { name: '--focus-ring-offset', description: 'Gap between the control and its outline.' },
  ]),

  ...shared('Radius', [
    { name: '--radius-xs', description: 'Checkboxes.', usage: 'rounded-xs' },
    { name: '--radius-sm', description: 'Small inner elements.', usage: 'rounded-sm' },
    { name: '--radius-md', description: 'Nested tiles.', usage: 'rounded-md' },
    { name: '--radius-lg', description: 'Cards.', usage: 'rounded-lg' },
    { name: '--radius-xl', description: 'App shell.', usage: 'rounded-xl' },
    {
      name: '--radius-pill',
      description: 'Every control: buttons, inputs, selects, chips, icon buttons.',
      usage: 'rounded-pill',
    },
  ]),

  ...shared('Shadow', [
    { name: '--shadow-none', description: 'Default: depth comes from tone.', usage: 'shadow-none' },
  ]),
  ...perTheme('Shadow', [
    {
      name: '--shadow-overlay',
      description: 'Popovers, menus, dialogs only. Warm-tinted; much weaker in dark mode.',
      usage: 'shadow-overlay',
    },
  ]),

  ...shared('Spacing', [
    { name: '--space-card', description: 'Card padding.', usage: 'p-card' },
    { name: '--space-tile', description: 'Nested tile padding.', usage: 'p-tile' },
    { name: '--gap-grid', description: 'Gap between dashboard cards.', usage: 'gap-grid' },
  ]),

  ...shared('Typography', [
    {
      name: '--font-sans',
      description: 'Geist (self-hosted), then system UI.',
      usage: 'font-sans',
    },
    { name: '--font-mono', description: 'Code and ids in dev tools.', usage: 'font-mono' },
    ...TYPE_SCALE.flatMap(([step, note]): Entry[] => [
      { name: `--font-size-${step}`, description: `Size, ${note}.`, usage: `text-${step}` },
      { name: `--line-height-${step}`, description: `Line height for text-${step}.` },
    ]),
    {
      name: '--font-weight-regular',
      description: 'Body and display numbers.',
      usage: 'font-normal',
    },
    { name: '--font-weight-medium', description: 'Labels, buttons.', usage: 'font-medium' },
    { name: '--font-weight-semibold', description: 'Headings.', usage: 'font-semibold' },
    {
      name: '--letter-spacing-display',
      description: 'Tracking for display sizes (applied by text-display*).',
    },
  ]),

  ...shared('Density', [
    {
      name: '--row-height',
      description: 'Table row height. 52px comfortable, 40px compact.',
      usage: 'h-row',
    },
    {
      name: '--control-h-sm',
      description: 'Small control height. 32px / 28px.',
      usage: 'h-control-sm',
    },
    {
      name: '--control-h-md',
      description: 'Default control height. 40px / 34px.',
      usage: 'h-control-md',
    },
    {
      name: '--control-h-lg',
      description: 'Large control height. 48px / 40px.',
      usage: 'h-control-lg',
    },
  ]),

  ...shared('Motion', [
    {
      name: '--duration-fast',
      description: 'Hover and press feedback. 0ms under reduced motion.',
      usage: 'duration-(--duration-fast)',
    },
    {
      name: '--duration-base',
      description: 'Enter/exit transitions. 0ms under reduced motion.',
      usage: 'duration-(--duration-base)',
    },
    { name: '--ease-standard', description: 'Default easing curve.', usage: 'ease-standard' },
  ]),
]

export function tokensInGroup(group: TokenGroup): Token[] {
  return TOKENS.filter((token) => token.group === group)
}
