import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  formatCurrencyToParts,
  formatDate,
  formatNumber,
  formatPercent,
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
