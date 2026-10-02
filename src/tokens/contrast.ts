/*
 * WCAG 2.x contrast math, plus the list of token pairs the kit guarantees.
 * Used by the contrast guard test (against tokens.css) and the Tokens docs
 * page (against computed styles).
 */

/** Parse #rgb or #rrggbb into 0–255 channels. Returns null for anything else. */
export function parseHex(value: string): [number, number, number] | null {
  const hex = value.trim().replace(/^#/, '')
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => char + char)
          .join('')
      : hex
  if (!/^[0-9a-f]{6}$/i.test(full)) return null
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
}

/** WCAG relative luminance (0 = black, 1 = white). */
export function relativeLuminance(color: string): number {
  const rgb = parseHex(color)
  if (!rgb) throw new Error(`Not a hex color: ${color}`)
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio, 1 to 21. Order of arguments doesn't matter. */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ]
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * 'text': normal-size text, AA = 4.5.
 * 'large-text': ≥24px (or ≥18.66px bold), AA = 3.
 * 'graphic': non-text UI such as dots, chart marks, focus rings (WCAG 1.4.11), 3.
 */
export type ContrastKind = 'text' | 'large-text' | 'graphic'

export interface ContrastPair {
  fg: `--${string}`
  bg: `--${string}`
  min: number
  kind: ContrastKind
}

const STATUSES = ['success', 'warning', 'danger', 'info', 'neutral'] as const
const SURFACES = [
  '--color-canvas',
  '--color-surface',
  '--color-surface-subtle',
  '--color-surface-muted',
] as const

/** Every pair asserted in both themes by the contrast test. */
export const CONTRAST_PAIRS: ContrastPair[] = [
  ...SURFACES.map((bg): ContrastPair => ({ fg: '--color-fg', bg, min: 4.5, kind: 'text' })),
  { fg: '--color-fg-muted', bg: '--color-surface', min: 4.5, kind: 'text' },
  { fg: '--color-fg-muted', bg: '--color-surface-subtle', min: 4.5, kind: 'text' },
  { fg: '--color-fg-subtle', bg: '--color-surface', min: 3, kind: 'large-text' },
  { fg: '--color-fg-subtle', bg: '--color-surface-subtle', min: 3, kind: 'large-text' },
  { fg: '--color-fg-inverse', bg: '--color-surface-inverse', min: 4.5, kind: 'text' },

  { fg: '--color-ink-fg', bg: '--color-ink', min: 4.5, kind: 'text' },
  { fg: '--color-accent-solid-fg', bg: '--color-accent-solid', min: 4.5, kind: 'text' },
  { fg: '--color-accent-text', bg: '--color-surface', min: 4.5, kind: 'text' },
  { fg: '--color-accent-subtle-fg', bg: '--color-accent-subtle', min: 4.5, kind: 'text' },
  {
    fg: '--color-accent-gradient-fg',
    bg: '--color-accent-gradient-from',
    min: 3,
    kind: 'large-text',
  },
  {
    fg: '--color-accent-gradient-fg',
    bg: '--color-accent-gradient-to',
    min: 3,
    kind: 'large-text',
  },

  ...STATUSES.flatMap((status): ContrastPair[] => [
    {
      fg: `--color-status-${status}-fg`,
      bg: `--color-status-${status}-subtle`,
      min: 4.5,
      kind: 'text',
    },
    { fg: `--color-status-${status}`, bg: '--color-surface', min: 3, kind: 'graphic' },
  ]),

  { fg: '--color-focus-ring', bg: '--color-surface', min: 3, kind: 'graphic' },
  { fg: '--color-focus-ring', bg: '--color-canvas', min: 3, kind: 'graphic' },

  { fg: '--color-chart-1', bg: '--color-chart-2', min: 3, kind: 'graphic' },
  ...(['1', '2', '3', '4'] as const).map((n): ContrastPair => ({
    fg: `--color-chart-${n}`,
    bg: '--color-surface',
    min: 3,
    kind: 'graphic',
  })),
  { fg: '--color-chart-hatch-fg', bg: '--color-surface', min: 3, kind: 'graphic' },
]
