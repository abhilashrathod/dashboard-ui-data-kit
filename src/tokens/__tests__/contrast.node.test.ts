import { afterAll, describe, expect, it } from 'vitest'
import { CONTRAST_PAIRS, contrastRatio, parseHex, relativeLuminance } from '../contrast'
import { readTokensCss, resolveTheme } from './tokens-css'

describe('contrast math', () => {
  it('matches known WCAG values', () => {
    expect(contrastRatio('#000', '#FFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1)
    // #767676 is the classic lightest gray passing 4.5:1 on white; #777 just fails.
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2)
    expect(contrastRatio('#777777', '#FFFFFF')).toBeLessThan(4.5)
    expect(contrastRatio('#FF0000', '#FFFFFF')).toBeCloseTo(4.0, 2)
  })

  it('is symmetric', () => {
    expect(contrastRatio('#C44D25', '#FFFFFF')).toBe(contrastRatio('#FFFFFF', '#C44D25'))
  })

  it('computes relative luminance at the extremes and for pure channels', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 10)
    expect(relativeLuminance('#00FF00')).toBeCloseTo(0.7152, 4)
  })

  it('parses 3- and 6-digit hex and rejects anything else', () => {
    expect(parseHex('#abc')).toEqual([170, 187, 204])
    expect(parseHex(' #E8613A ')).toEqual([232, 97, 58])
    expect(parseHex('rgb(0 0 0)')).toBeNull()
    expect(() => relativeLuminance('tomato')).toThrow()
  })
})

const blocks = readTokensCss()
const THEMES = ['light', 'dark'] as const
const resolved = { light: resolveTheme(blocks, 'light'), dark: resolveTheme(blocks, 'dark') }

function ratio(theme: (typeof THEMES)[number], fg: string, bg: string): number {
  const values = resolved[theme]
  return contrastRatio(values.get(fg) ?? fg, values.get(bg) ?? bg)
}

/** Not asserted: printed so the trade-offs stay visible. */
const INFO_PAIRS = [
  {
    fg: '--color-accent-gradient-fg',
    bg: '--color-accent-gradient-to',
    note: 'small text needs 4.5',
  },
  { fg: '--color-chart-1', bg: '--color-chart-3', note: 'series separation' },
  { fg: '--color-chart-1', bg: '--color-chart-4', note: 'series separation' },
  { fg: '--color-border-strong', bg: '--color-surface', note: 'outline pill / input edge' },
]

const rows: string[] = []

describe.each(THEMES)('token contrast (%s)', (theme) => {
  it.each(CONTRAST_PAIRS)('$fg on $bg ≥ $min', ({ fg, bg, min, kind }) => {
    const value = ratio(theme, fg, bg)
    rows.push(
      `${theme.padEnd(5)}  ${fg.padEnd(30)} ${bg.padEnd(30)} ${value.toFixed(2).padStart(5)}  ≥${String(min).padEnd(3)} ${kind.padEnd(10)} ${value >= min ? 'pass' : 'FAIL'}`,
    )
    expect(value).toBeGreaterThanOrEqual(min)
  })
})

afterAll(() => {
  const info = THEMES.flatMap((theme) =>
    INFO_PAIRS.map(
      ({ fg, bg, note }) =>
        `${theme.padEnd(5)}  ${fg.padEnd(30)} ${bg.padEnd(30)} ${ratio(theme, fg, bg).toFixed(2).padStart(5)}  info  ${note}`,
    ),
  )
  // Straight to stdout: Vitest hides console output from passing tests.
  process.stdout.write(
    [
      'theme  fg                             bg                             ratio  min  kind       result',
      ...rows,
      '',
      ...info,
      '',
    ].join('\n'),
  )
})
