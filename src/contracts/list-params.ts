import { z } from 'zod'
import { Channel, OrderStatus } from './order'

// ── Schema ───────────────────────────────────────────────────────────────────

export const PAGE_SIZE_MAX = 500
export const QUERY_MAX_LENGTH = 100

export const SORT_FIELDS = ['createdAt', 'amount', 'customer', 'status'] as const
export const SortField = z.enum(SORT_FIELDS)
export type SortField = z.infer<typeof SortField>

/** "amount" sorts ascending, "-amount" descending. Single sort only. */
export const Sort = z.union([SortField, z.templateLiteral(['-', SortField])], {
  error: `must be one of ${SORT_FIELDS.join(', ')}, optionally prefixed with "-"`,
})
export type Sort = z.infer<typeof Sort>

const ENUM_BY_FIELD = { status: OrderStatus, channel: Channel } as const

const InFilter = z
  .object({
    field: z.enum(['status', 'channel']),
    op: z.literal('in'),
    value: z.array(z.string()).min(1, { error: 'needs at least one value' }),
  })
  .superRefine((filter, ctx) => {
    const allowed: readonly string[] = ENUM_BY_FIELD[filter.field].options
    filter.value.forEach((value, index) => {
      if (allowed.includes(value)) return
      ctx.addIssue({
        code: 'custom',
        path: ['value', index],
        message: `"${value}" is not a valid ${filter.field} (expected one of: ${allowed.join(', ')})`,
      })
    })
  })

const AmountCompareFilter = z.object({
  field: z.literal('amount'),
  op: z.enum(['gt', 'lt']),
  value: z.number(),
})

// Range-order checks only run once both ends are individually valid, so a bad
// date reports just that, not a misleading "from must be on or before to" too.
const whenValid = { when: (payload: { issues: readonly unknown[] }) => payload.issues.length === 0 }

const AmountBetweenFilter = z
  .object({
    field: z.literal('amount'),
    op: z.literal('between'),
    value: z.tuple([z.number(), z.number()]),
  })
  .refine(({ value: [min, max] }) => min <= max, {
    error: 'min must be <= max',
    path: ['value'],
    ...whenValid,
  })

const isoDate = z.iso.date({
  error: (issue) => `"${String(issue.input)}" is not a valid yyyy-mm-dd date`,
})

/** End date is inclusive; that is applied by the query engine, not here. */
const CreatedAtBetweenFilter = z
  .object({
    field: z.literal('createdAt'),
    op: z.literal('between'),
    value: z.tuple([isoDate, isoDate]),
  })
  .refine(({ value: [from, to] }) => from <= to, {
    error: 'from must be on or before to',
    path: ['value'],
    ...whenValid,
  })

/**
 * Discriminated on `op`. Both `between` variants share that op, so they sit
 * in a nested union discriminated on `field`.
 */
export const Filter = z.discriminatedUnion('op', [
  InFilter,
  AmountCompareFilter,
  z.discriminatedUnion('field', [AmountBetweenFilter, CreatedAtBetweenFilter]),
])
export type Filter = z.infer<typeof Filter>
export type FilterField = Filter['field']
export type FilterOp = Filter['op']

/** Field allowlist and the ops each field accepts. Decoding checks this first for readable errors. */
export const FILTER_OPS = {
  amount: ['gt', 'lt', 'between'],
  channel: ['in'],
  createdAt: ['between'],
  status: ['in'],
} as const satisfies Record<FilterField, readonly FilterOp[]>

export const ListParams = z.object({
  page: z.int().min(1),
  pageSize: z.int().min(1).max(PAGE_SIZE_MAX),
  sort: Sort,
  q: z.string().trim().max(QUERY_MAX_LENGTH).optional(),
  filters: z.array(Filter),
})
export type ListParams = z.infer<typeof ListParams>

export const DEFAULT_LIST_PARAMS: Readonly<ListParams> = Object.freeze({
  page: 1,
  pageSize: 50,
  sort: '-createdAt',
  filters: [],
})

/** Fill in defaults for any missing (or undefined) keys. */
export function withDefaults(partial: Partial<ListParams> = {}): ListParams {
  return {
    page: partial.page ?? DEFAULT_LIST_PARAMS.page,
    pageSize: partial.pageSize ?? DEFAULT_LIST_PARAMS.pageSize,
    sort: partial.sort ?? DEFAULT_LIST_PARAMS.sort,
    ...(partial.q === undefined ? {} : { q: partial.q }),
    filters: [...(partial.filters ?? DEFAULT_LIST_PARAMS.filters)],
  }
}

// ── Canonicalization ─────────────────────────────────────────────────────────
// The single place that decides what "equal params" means. Both encode and
// decode go through normalizeListParams, so equal params always produce the
// same string (used as the TanStack Query cache key).

/** Code-unit order. Not localeCompare, which varies by locale and would break key stability. */
function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function encodeFilter(filter: Filter): string {
  switch (filter.op) {
    case 'in':
      return `${filter.field}:in:${filter.value.join(',')}`
    case 'gt':
    case 'lt':
      return `${filter.field}:${filter.op}:${filter.value}`
    case 'between':
      return `${filter.field}:between:${filter.value[0]}..${filter.value[1]}`
  }
}

function canonicalFilter(filter: Filter): Filter {
  if (filter.op !== 'in') return filter
  return { ...filter, value: [...new Set(filter.value)].sort(compareStrings) }
}

/**
 * Canonical form: q trimmed (dropped when empty); `in` values deduped and
 * sorted; filters deduped and sorted by field, then op, then value.
 */
export function normalizeListParams(params: ListParams): ListParams {
  const byToken = new Map<string, Filter>()
  for (const filter of params.filters) {
    const canonical = canonicalFilter(filter)
    byToken.set(encodeFilter(canonical), canonical)
  }
  const filters = [...byToken]
    .sort(
      ([tokenA, a], [tokenB, b]) =>
        compareStrings(a.field, b.field) ||
        compareStrings(a.op, b.op) ||
        compareStrings(tokenA, tokenB),
    )
    .map(([, filter]) => filter)

  const q = params.q?.trim()
  return {
    page: params.page,
    pageSize: params.pageSize,
    sort: params.sort,
    ...(q ? { q } : {}),
    filters,
  }
}

// ── Encode ───────────────────────────────────────────────────────────────────

/** Canonical query string: defaults omitted, fixed key order page, size, sort, q, f. */
export function encodeListParams(params: ListParams): URLSearchParams {
  const canonical = normalizeListParams(params)
  const sp = new URLSearchParams()
  if (canonical.page !== DEFAULT_LIST_PARAMS.page) sp.set('page', String(canonical.page))
  if (canonical.pageSize !== DEFAULT_LIST_PARAMS.pageSize)
    sp.set('size', String(canonical.pageSize))
  if (canonical.sort !== DEFAULT_LIST_PARAMS.sort) sp.set('sort', canonical.sort)
  if (canonical.q) sp.set('q', canonical.q)
  for (const filter of canonical.filters) sp.append('f', encodeFilter(filter))
  return sp
}

/** Stable string for equal params; use as the TanStack Query key segment. */
export function listParamsKey(params: ListParams): string {
  return encodeListParams(params).toString()
}

// ── Decode ───────────────────────────────────────────────────────────────────

type Parsed<T> = { ok: true; value: T } | { ok: false; issue: string }

const ok = <T>(value: T): Parsed<T> => ({ ok: true, value })
const fail = (issue: string): { ok: false; issue: string } => ({ ok: false, issue })

/** Accepts what `String(number)` produces (including exponents); rejects "", "0x10", "Infinity". */
function parseNumber(raw: string): Parsed<number> {
  if (!/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(raw)) return fail(`"${raw}" is not a number`)
  return ok(Number(raw))
}

function parseIntInRange(raw: string, min: number, max?: number): Parsed<number> {
  const value = /^\d+$/.test(raw) ? Number(raw) : Number.NaN
  const inRange = Number.isSafeInteger(value) && value >= min && (max === undefined || value <= max)
  if (inRange) return ok(value)
  return fail(
    max === undefined
      ? `must be an integer >= ${min}`
      : `must be an integer between ${min} and ${max}`,
  )
}

function parseSort(raw: string): Parsed<Sort> {
  const result = Sort.safeParse(raw)
  return result.success ? ok(result.data) : fail(result.error.issues[0]?.message ?? 'invalid sort')
}

function parseQuery(raw: string): Parsed<string | undefined> {
  const q = raw.trim()
  if (q.length > QUERY_MAX_LENGTH) return fail(`must be at most ${QUERY_MAX_LENGTH} characters`)
  return ok(q || undefined)
}

// One small parser per op family. Each builds an unvalidated candidate;
// validateFilter then runs it through the Filter schema.

function parseInCandidate(field: FilterField, raw: string): Parsed<unknown> {
  const values = raw.split(',')
  if (values.some((value) => value === '')) {
    return fail(raw === '' ? 'needs at least one value' : 'contains an empty value')
  }
  return ok({ field, op: 'in', value: values })
}

function parseCompareCandidate(field: FilterField, op: string, raw: string): Parsed<unknown> {
  const value = parseNumber(raw)
  return value.ok ? ok({ field, op, value: value.value }) : value
}

function parseBetweenCandidate(field: FilterField, raw: string): Parsed<unknown> {
  const parts = raw.split('..')
  if (parts.length !== 2) return fail(`expected a range like "min..max", got "${raw}"`)
  const [from = '', to = ''] = parts
  if (field !== 'amount') return ok({ field, op: 'between', value: [from, to] })

  const min = parseNumber(from)
  if (!min.ok) return min
  const max = parseNumber(to)
  if (!max.ok) return max
  return ok({ field, op: 'between', value: [min.value, max.value] })
}

function validateFilter(candidate: unknown): Parsed<Filter> {
  const result = Filter.safeParse(candidate)
  if (result.success) return ok(result.data)
  return fail(result.error.issues.map((issue) => issue.message).join('; '))
}

function isFilterField(field: string): field is FilterField {
  return Object.hasOwn(FILTER_OPS, field)
}

/** Parses one `f` value of the form field:op:value. */
function parseFilter(raw: string): Parsed<Filter> {
  const first = raw.indexOf(':')
  const second = first === -1 ? -1 : raw.indexOf(':', first + 1)
  if (second === -1) return fail('expected field:op:value')

  const field = raw.slice(0, first)
  const op = raw.slice(first + 1, second)
  const value = raw.slice(second + 1)

  if (!isFilterField(field)) {
    return fail(`unknown field "${field}" (allowed: ${Object.keys(FILTER_OPS).join(', ')})`)
  }
  const allowedOps: readonly string[] = FILTER_OPS[field]
  if (!allowedOps.includes(op)) {
    return fail(`op "${op}" not allowed for ${field} (allowed: ${allowedOps.join(', ')})`)
  }

  const candidate =
    op === 'in'
      ? parseInCandidate(field, value)
      : op === 'between'
        ? parseBetweenCandidate(field, value)
        : parseCompareCandidate(field, op, value)
  return candidate.ok ? validateFilter(candidate.value) : candidate
}

/** Reads a key that may appear at most once. Absent → ok(undefined). */
function decodeScalar<T>(
  sp: URLSearchParams,
  key: string,
  parse: (raw: string) => Parsed<T>,
): Parsed<T | undefined> {
  const values = sp.getAll(key)
  if (values.length === 0) return ok(undefined)
  if (values.length > 1) return fail(`${key}: given ${values.length} times, expected once`)
  const raw = values[0] ?? ''
  const result = parse(raw)
  if (result.ok) return result
  // Don't echo very long input (e.g. an oversized q) back into the message.
  const shown = raw.length > 40 ? '' : ` "${raw}"`
  return fail(`${key}${shown}: ${result.issue}`)
}

export type DecodeMode = 'strict' | 'lenient'
export type StrictDecodeResult = { ok: true; params: ListParams } | { ok: false; issues: string[] }
export type LenientDecodeResult = { ok: true; params: ListParams; dropped: string[] }

/**
 * Parse a query string into canonical ListParams. Never throws; unknown keys are ignored.
 * - strict (API client, MSW handlers): any invalid part fails, with one issue per problem.
 * - lenient (browser URL state): invalid filters are dropped and invalid scalars fall back
 *   to defaults; every discarded part is listed in `dropped`.
 */
export function decodeListParams(
  sp: URLSearchParams,
  options: { mode: 'strict' },
): StrictDecodeResult
export function decodeListParams(
  sp: URLSearchParams,
  options: { mode: 'lenient' },
): LenientDecodeResult
export function decodeListParams(
  sp: URLSearchParams,
  { mode }: { mode: DecodeMode },
): StrictDecodeResult | LenientDecodeResult {
  const problems: string[] = []
  function orDefault<T>(result: Parsed<T | undefined>, fallback: T): T {
    if (result.ok) return result.value ?? fallback
    problems.push(result.issue)
    return fallback
  }

  const page = orDefault(
    decodeScalar(sp, 'page', (raw) => parseIntInRange(raw, 1)),
    DEFAULT_LIST_PARAMS.page,
  )
  const pageSize = orDefault(
    decodeScalar(sp, 'size', (raw) => parseIntInRange(raw, 1, PAGE_SIZE_MAX)),
    DEFAULT_LIST_PARAMS.pageSize,
  )
  const sort = orDefault(decodeScalar(sp, 'sort', parseSort), DEFAULT_LIST_PARAMS.sort)
  const q = orDefault(decodeScalar(sp, 'q', parseQuery), undefined)

  const filters: Filter[] = []
  sp.getAll('f').forEach((raw, index) => {
    const filter = parseFilter(raw)
    if (filter.ok) filters.push(filter.value)
    else problems.push(`f[${index}] "${raw}": ${filter.issue}`)
  })

  const params = normalizeListParams({ page, pageSize, sort, q, filters })
  if (mode === 'lenient') return { ok: true, params, dropped: problems }
  return problems.length > 0 ? { ok: false, issues: problems } : { ok: true, params }
}
