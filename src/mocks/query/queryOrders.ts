import type { Filter, ListParams, Order, OrderStatus, Page, Sort, SortField } from '@/contracts'

const DAY_MS = 86_400_000

// ── Filters (AND semantics) ──────────────────────────────────────────────────

// Filter dates are calendar days in UTC. Using UTC keeps results deterministic
// wherever this runs (any browser timezone, CI) and matches what a real server
// would do. The range is inclusive: 00:00:00.000Z on `from` through
// 23:59:59.999Z on `to`.
const utcDayStart = (date: string) => Date.parse(`${date}T00:00:00.000Z`)
const utcDayEnd = (date: string) => utcDayStart(date) + DAY_MS - 1

export function matchesFilter(order: Order, filter: Filter): boolean {
  switch (filter.op) {
    case 'in':
      return filter.value.includes(order[filter.field])
    case 'gt':
      return order.amount > filter.value
    case 'lt':
      return order.amount < filter.value
    case 'between': {
      if (filter.field === 'amount') {
        const [min, max] = filter.value
        return order.amount >= min && order.amount <= max
      }
      const [from, to] = filter.value
      const created = Date.parse(order.createdAt)
      return created >= utcDayStart(from) && created <= utcDayEnd(to)
    }
  }
}

/** Trimmed, case-insensitive substring match on id, reference, customer name and email. */
export function matchesQuery(order: Order, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (needle === '') return true
  return [order.id, order.reference, order.customer.name, order.customer.email].some((field) =>
    field.toLowerCase().includes(needle),
  )
}

// ── Sorting ──────────────────────────────────────────────────────────────────

type Comparator = (a: Order, b: Order) => number

/** Case- and accent-insensitive name ordering ("émile" sorts with "Emile", "bob" before "Chen"). */
const nameCollator = new Intl.Collator('en', { sensitivity: 'base' })

/**
 * Status sorts by lifecycle stage, not alphabetically. This is a deliberate
 * product decision: people scanning orders think in workflow order
 * (pending → paid → shipped), with the unhappy outcomes at the end.
 */
const STATUS_LIFECYCLE: Record<OrderStatus, number> = {
  pending: 0,
  paid: 1,
  shipped: 2,
  refunded: 3,
  failed: 4,
}

const COMPARE_FIELD: Record<SortField, Comparator> = {
  // Parsed, not string-compared: valid ISO strings may omit milliseconds,
  // and "…00Z" > "…00.500Z" as strings.
  createdAt: (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  amount: (a, b) => a.amount - b.amount,
  customer: (a, b) => nameCollator.compare(a.customer.name, b.customer.name),
  status: (a, b) => STATUS_LIFECYCLE[a.status] - STATUS_LIFECYCLE[b.status],
}

/** Ids are fixed-width (ORD-000123), so code-unit order is numeric order. */
const compareIds: Comparator = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * "amount" → ascending, "-amount" → descending. Ties ALWAYS break by id
 * ascending, in both directions, so a row's position is fully determined and
 * pagination never skips or repeats rows.
 */
export function compareBy(sort: Sort): Comparator {
  const descending = sort.startsWith('-')
  const field = (descending ? sort.slice(1) : sort) as SortField
  const compareField = COMPARE_FIELD[field]
  const direction = descending ? -1 : 1
  return (a, b) => direction * compareField(a, b) || compareIds(a, b)
}

// ── Query ────────────────────────────────────────────────────────────────────

/**
 * The mock server's "SELECT … WHERE … ORDER BY … LIMIT/OFFSET". Never mutates
 * `orders`. Pages are 1-based; a page past the end returns no rows, but still
 * reports the right total (no clamping).
 */
export function queryOrders(orders: readonly Order[], params: ListParams): Page<Order> {
  const q = params.q ?? ''
  const matching = orders.filter(
    (order) =>
      params.filters.every((filter) => matchesFilter(order, filter)) && matchesQuery(order, q),
  )
  // `filter` returned a new array, so sorting it in place leaves the input untouched.
  matching.sort(compareBy(params.sort))

  const start = (params.page - 1) * params.pageSize
  return {
    rows: matching.slice(start, start + params.pageSize),
    total: matching.length,
    page: params.page,
    pageSize: params.pageSize,
  }
}
