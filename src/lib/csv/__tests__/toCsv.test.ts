import { describe, expect, it } from 'vitest'
import { csvField, guardFormula, toCsv, type CsvColumn } from '../toCsv'

type Row = { a: unknown; b?: unknown }
const COLUMNS: CsvColumn<Row>[] = [
  { header: 'A', value: (row) => row.a },
  { header: 'B', value: (row) => row.b },
]

describe('csvField: quoting (RFC 4180)', () => {
  it.each([
    ['plain', 'plain'],
    ['a,b', '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ['line\nbreak', '"line\nbreak"'],
    ['carriage\rreturn', '"carriage\rreturn"'],
    ['all, of "it"\r\n', '"all, of ""it""\r\n"'],
  ])('%j → %j', (value, expected) => {
    expect(csvField(value)).toBe(expected)
  })

  it('writes null and undefined as empty fields, numbers with String()', () => {
    expect(csvField(null)).toBe('')
    expect(csvField(undefined)).toBe('')
    expect(csvField(1234.5)).toBe('1234.5') // no "1,234.5": no locale formatting
    expect(csvField(-5)).toBe('-5') // a number, so no formula guard
    expect(csvField(0)).toBe('0')
    expect(csvField(true)).toBe('true')
  })

  it('writes Dates as ISO and other objects as JSON (quoted when needed)', () => {
    expect(csvField(new Date('2026-10-02T08:00:00.000Z'))).toBe('2026-10-02T08:00:00.000Z')
    expect(csvField({ a: 1, b: 2 })).toBe('"{""a"":1,""b"":2}"')
  })
})

describe('formula injection guard', () => {
  it.each(['=SUM(A1)', '+1', '@cmd', '-foo', '\tleading tab', '\rleading CR', '=1+1'])(
    '%j is prefixed with a quote',
    (value) => {
      expect(guardFormula(value)).toBe(`'${value}`)
    },
  )

  it.each(['-12.50', '42', '-7', '0.5', 'José', 'a=b'])('%j is left alone', (value) => {
    expect(guardFormula(value)).toBe(value)
  })

  it('guards before quoting, so a guarded field with a comma is still one field', () => {
    expect(csvField('=HYPERLINK("x", "y")')).toBe('"\'=HYPERLINK(""x"", ""y"")"')
  })
})

describe('toCsv', () => {
  it('writes a header row, then one line per row, every line ending in CRLF', () => {
    const csv = toCsv([{ a: 1, b: 'x' }, { a: 2 }], COLUMNS)
    expect(csv).toBe('A,B\r\n1,x\r\n2,\r\n')
  })

  it('ends with exactly one CRLF, and has no bare LF line endings', () => {
    const csv = toCsv([{ a: 'one' }, { a: 'two' }], COLUMNS)
    expect(csv.endsWith('\r\n')).toBe(true)
    expect(csv.endsWith('\r\n\r\n')).toBe(false)
    expect(csv.replaceAll('\r\n', '').includes('\n')).toBe(false)
  })

  it('is just the header line for no rows', () => {
    expect(toCsv([], COLUMNS)).toBe('A,B\r\n')
  })

  it('keeps Unicode as is', () => {
    const csv = toCsv(
      [
        { a: 'José', b: 'Zoë 🎉' },
        { a: '東京', b: 'Ünïcödé' },
      ],
      COLUMNS,
    )
    expect(csv).toBe('A,B\r\nJosé,Zoë 🎉\r\n東京,Ünïcödé\r\n')
  })

  it('quotes and guards headers too', () => {
    expect(toCsv([], [{ header: '=Total, USD', value: () => 1 }])).toBe('"\'=Total, USD"\r\n')
  })
})
