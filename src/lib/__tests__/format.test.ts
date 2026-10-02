import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  formatCurrencyToParts,
  formatDate,
  formatNumber,
  formatPercent,
  formatRelative,
  MINUS,
} from '../format'

describe('formatCurrency', () => {
  it('formats USD with cents', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats compact values', () => {
    expect(formatCurrency(14000, { compact: true })).toBe('$14K')
    expect(formatCurrency(1_250_000, { compact: true })).toBe('$1.3M')
    expect(formatCurrency(950, { compact: true })).toBe('$950')
  })

  it('uses a real minus sign for negatives, and never shows "-0"', () => {
    expect(formatCurrency(-80)).toBe(`${MINUS}$80.00`)
    expect(formatCurrency(-14000, { compact: true })).toBe(`${MINUS}$14K`)
    expect(formatCurrency(-0)).toBe('$0.00')
  })

  it('splits into parts with the currency symbol separate', () => {
    const parts = formatCurrencyToParts(-48210.5)
    expect(parts.map((part) => part.value).join('')).toBe(`${MINUS}$48,210.50`)
    expect(parts.find((part) => part.type === 'currency')?.value).toBe('$')
  })
})

describe('formatNumber', () => {
  it('groups thousands and compacts', () => {
    expect(formatNumber(1284)).toBe('1,284')
    expect(formatNumber(1284, { compact: true })).toBe('1.3K')
    expect(formatNumber(-5)).toBe(`${MINUS}5`)
  })
})

describe('formatPercent', () => {
  it('formats a fraction with the requested digits', () => {
    expect(formatPercent(0.124)).toBe('12%')
    expect(formatPercent(0.124, { digits: 1 })).toBe('12.4%')
    expect(formatPercent(0.07, { digits: 1 })).toBe('7%')
    expect(formatPercent(-0.031, { digits: 1 })).toBe(`${MINUS}3.1%`)
  })
})

describe('formatDate', () => {
  it('formats in UTC regardless of the local time zone', () => {
    expect(formatDate('2026-09-30T23:30:00Z', { style: 'short' })).toBe('9/30/26')
    expect(formatDate('2026-09-30T00:00:00Z')).toBe('Sep 30, 2026')
  })

  it('returns a dash for invalid input', () => {
    expect(formatDate('not a date')).toBe('—')
  })
})

describe('formatRelative', () => {
  const now = Date.parse('2026-09-30T12:00:00Z')
  const ago = (ms: number) => formatRelative(now - ms, now)

  it('uses seconds under 45s', () => {
    expect(ago(0)).toBe('now')
    expect(ago(30_000)).toBe('30 seconds ago')
  })

  it('uses minutes under 45 minutes', () => {
    expect(ago(50_000)).toBe('1 minute ago')
    expect(ago(2 * 60_000)).toBe('2 minutes ago')
    expect(ago(44 * 60_000)).toBe('44 minutes ago')
  })

  it('uses hours, then days', () => {
    expect(ago(50 * 60_000)).toBe('1 hour ago')
    expect(ago(3 * 3_600_000)).toBe('3 hours ago')
    expect(ago(26 * 3_600_000)).toBe('yesterday')
    expect(ago(3 * 86_400_000)).toBe('3 days ago')
  })

  it('handles the future', () => {
    expect(formatRelative(now + 2 * 60_000, now)).toBe('in 2 minutes')
  })
})
