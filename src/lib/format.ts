/*
 * Display formatters. One locale (en-US) and one currency (USD): multi-currency
 * and localisation are out of scope for this kit. Formatters are created once at
 * module level, because Intl constructors are slow and these run per table cell.
 *
 * Negative numbers use a real minus sign (U+2212), not a hyphen.
 */

const LOCALE = 'en-US'
const CURRENCY = 'USD'
export const MINUS = '−'

const compactOptions = { notation: 'compact', maximumFractionDigits: 1 } as const

const currency = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY })
const currencyCompact = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  ...compactOptions,
})
const number = new Intl.NumberFormat(LOCALE)
const numberCompact = new Intl.NumberFormat(LOCALE, compactOptions)
const percentByDigits = new Map<number, Intl.NumberFormat>()

/**
 * Dates are shown in UTC: the mock API returns UTC timestamps, and a fixed zone
 * keeps a date the same for every viewer (and in tests).
 */
const dates = {
  short: new Intl.DateTimeFormat(LOCALE, { dateStyle: 'short', timeZone: 'UTC' }),
  medium: new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeZone: 'UTC' }),
}

/** -0 would format as "-$0.00". */
const normalize = (value: number) => (value === 0 ? 0 : value)
const withMinus = (text: string) => text.replace('-', MINUS)

export interface CompactOption {
  /** 14000 → "$14K". */
  compact?: boolean
}

/** "$1,234.50", "−$80.00", or compact "$14K". */
export function formatCurrency(value: number, { compact = false }: CompactOption = {}): string {
  return withMinus((compact ? currencyCompact : currency).format(normalize(value)))
}

/** Same as formatCurrency, split into Intl parts (for rendering the symbol separately). */
export function formatCurrencyToParts(
  value: number,
  { compact = false }: CompactOption = {},
): Intl.NumberFormatPart[] {
  return (compact ? currencyCompact : currency)
    .formatToParts(normalize(value))
    .map((part) => (part.type === 'minusSign' ? { ...part, value: MINUS } : part))
}

/** "1,284", or compact "1.3K". */
export function formatNumber(value: number, { compact = false }: CompactOption = {}): string {
  return withMinus((compact ? numberCompact : number).format(normalize(value)))
}

/** A fraction as a percent: 0.124 → "12%" (digits 0) or "12.4%" (digits 1). */
export function formatPercent(fraction: number, { digits = 0 }: { digits?: number } = {}): string {
  let formatter = percentByDigits.get(digits)
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: digits })
    percentByDigits.set(digits, formatter)
  }
  return withMinus(formatter.format(normalize(fraction)))
}

/** An ISO timestamp as "9/30/26" (short) or "Sep 30, 2026" (medium). Invalid input → "—". */
export function formatDate(
  iso: string,
  { style = 'medium' }: { style?: 'short' | 'medium' } = {},
): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : dates[style].format(date)
}

const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

const RELATIVE_STEPS = [
  { unit: 'second', ms: 1000, below: 45 },
  { unit: 'minute', ms: 60_000, below: 45 },
  { unit: 'hour', ms: 3_600_000, below: 22 },
  { unit: 'day', ms: 86_400_000, below: Infinity },
] as const

/**
 * A timestamp relative to `now`: "now", "30 seconds ago", "2 minutes ago",
 * "3 hours ago", "yesterday". Each unit is used until it would read oddly
 * (45 seconds → "1 minute"), as Intl's own examples do.
 */
export function formatRelative(timestamp: number, now: number = Date.now()): string {
  const diff = timestamp - now
  for (const { unit, ms, below } of RELATIVE_STEPS) {
    const value = Math.round(diff / ms)
    if (Math.abs(value) < below) return relative.format(value === 0 ? 0 : value, unit)
  }
  return relative.format(Math.round(diff / 86_400_000), 'day')
}
