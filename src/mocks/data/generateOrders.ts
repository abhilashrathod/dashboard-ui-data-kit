import type { Channel, Order, OrderStatus } from '@/contracts'
import { createRng, logNormal, pick, weighted, type Rng } from './random'
import { EMAIL_DOMAINS, FIRST_NAMES, LAST_NAMES } from './wordlists'

const DAY_MS = 86_400_000

const WINDOW_MONTHS = 18
/** Most recent day's volume relative to the oldest day's. */
const GROWTH = 1.6
const WEEKDAY_FACTOR = 1.4
const PENDING_MAX_AGE_DAYS = 14
const MAX_UPDATE_DELAY_DAYS = 10

const CUSTOMER_POOL_SIZE = 800
/** >1 skews picks toward the front of the pool: a few customers order often. */
const CUSTOMER_SKEW = 1.3

const STATUS_WEIGHTS = [
  ['paid', 55],
  ['shipped', 25],
  ['pending', 10],
  ['refunded', 6],
  ['failed', 4],
] as const satisfies readonly (readonly [OrderStatus, number])[]

const SETTLED_STATUS_WEIGHTS = STATUS_WEIGHTS.filter(([status]) => status !== 'pending')

const CHANNEL_WEIGHTS = [
  ['web', 50],
  ['mobile', 30],
  ['marketplace', 15],
  ['pos', 5],
] as const satisfies readonly (readonly [Channel, number])[]

/** 1–12 items, each count ~0.7× as likely as the one below it. */
const ITEM_COUNT_WEIGHTS = Array.from({ length: 12 }, (_, i) => [i + 1, 0.7 ** i] as const)

/** Log-normal amount: median ≈ $120, long right tail. */
const AMOUNT_MU = Math.log(120)
const AMOUNT_SIGMA = 0.9
const AMOUNT_MIN = 5
const AMOUNT_MAX = 5000

const REFERENCE_CHARS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789']

interface Customer {
  name: string
  email: string
}

/** "José O'Brien" → "jose", "obrien": ASCII letters only, for email local parts. */
function slug(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

function buildCustomerPool(rng: Rng): Customer[] {
  const pool: Customer[] = []
  const emails = new Set<string>()
  while (pool.length < CUSTOMER_POOL_SIZE) {
    const first = pick(rng, FIRST_NAMES)
    const last = pick(rng, LAST_NAMES)
    const [f, l] = [slug(first), slug(last)]
    const local = pick(rng, [
      `${f}.${l}`,
      `${f}${l}`,
      `${f.charAt(0)}${l}`,
      `${f}_${l}`,
      `${f}.${l.charAt(0)}`,
    ])
    const domain = pick(rng, EMAIL_DOMAINS)

    let email = `${local}@${domain}`
    for (let n = 2; emails.has(email); n++) email = `${local}${n}@${domain}`
    emails.add(email)
    pool.push({ name: `${first} ${last}`, email })
  }
  return pool
}

function pickCustomer(rng: Rng, pool: readonly Customer[]): Customer {
  const index = Math.floor(rng() ** CUSTOMER_SKEW * pool.length)
  return pool[index] ?? pick(rng, pool)
}

/**
 * Samples a day start (ms) in the window. Day weights grow linearly from 1 to
 * GROWTH, and weekdays get WEEKDAY_FACTOR. Uses cumulative weights + binary
 * search, since a linear scan over ~550 days × 10k orders would be slow.
 */
function createDaySampler(windowStart: number, dayCount: number) {
  const cumulative: number[] = []
  let total = 0
  for (let d = 0; d < dayCount; d++) {
    const growth = 1 + (GROWTH - 1) * (dayCount > 1 ? d / (dayCount - 1) : 1)
    // UTC weekday at mid-day, so the result doesn't depend on the runner's timezone.
    const weekday = new Date(windowStart + d * DAY_MS + DAY_MS / 2).getUTCDay()
    const isWeekend = weekday === 0 || weekday === 6
    total += growth * (isWeekend ? 1 : WEEKDAY_FACTOR)
    cumulative.push(total)
  }

  return (rng: Rng): number => {
    const target = rng() * total
    let lo = 0
    let hi = dayCount - 1
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if ((cumulative[mid] ?? total) <= target) lo = mid + 1
      else hi = mid
    }
    return windowStart + lo * DAY_MS
  }
}

function uniqueReference(rng: Rng, used: Set<string>): string {
  let reference: string
  do {
    reference = 'PO-'
    for (let i = 0; i < 5; i++) reference += pick(rng, REFERENCE_CHARS)
  } while (used.has(reference))
  used.add(reference)
  return reference
}

/**
 * Deterministic order data: the same seed + anchor always produce the same
 * orders. Never reads the clock or Math.random.
 *
 * Orders span the 18 months before `anchor` (exclusive) and come back sorted
 * by createdAt, with ids assigned oldest-first (ORD-000001).
 */
export function generateOrders({
  seed,
  count,
  anchor,
}: {
  seed: number
  count: number
  anchor: Date
}): Order[] {
  const anchorMs = anchor.getTime()
  if (!Number.isFinite(anchorMs)) throw new RangeError('generateOrders: anchor is an invalid Date')
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('generateOrders: count must be a non-negative integer')
  }

  const rng = createRng(seed)
  const customers = buildCustomerPool(rng)

  const windowStartDate = new Date(anchorMs)
  windowStartDate.setUTCMonth(windowStartDate.getUTCMonth() - WINDOW_MONTHS)
  const windowStart = windowStartDate.getTime()
  const dayCount = Math.round((anchorMs - windowStart) / DAY_MS)
  const sampleDay = createDaySampler(anchorMs - dayCount * DAY_MS, dayCount)
  const pendingCutoff = anchorMs - PENDING_MAX_AGE_DAYS * DAY_MS
  const references = new Set<string>()

  const drafts: Omit<Order, 'id'>[] = []
  for (let i = 0; i < count; i++) {
    const createdMs = sampleDay(rng) + Math.floor(rng() * DAY_MS)

    let status: OrderStatus = weighted(rng, STATUS_WEIGHTS)
    if (status === 'pending' && createdMs < pendingCutoff) {
      status = weighted(rng, SETTLED_STATUS_WEIGHTS)
    }

    const updatedMs =
      status === 'pending'
        ? createdMs
        : Math.min(createdMs + Math.floor(rng() * MAX_UPDATE_DELAY_DAYS * DAY_MS), anchorMs)

    const rawAmount = logNormal(rng, AMOUNT_MU, AMOUNT_SIGMA)
    const amount = Math.round(Math.min(AMOUNT_MAX, Math.max(AMOUNT_MIN, rawAmount)) * 100) / 100

    drafts.push({
      reference: uniqueReference(rng, references),
      customer: pickCustomer(rng, customers),
      status,
      channel: weighted(rng, CHANNEL_WEIGHTS),
      amount,
      itemCount: weighted(rng, ITEM_COUNT_WEIGHTS),
      createdAt: new Date(createdMs).toISOString(),
      updatedAt: new Date(updatedMs).toISOString(),
    })
  }

  // ISO strings in the same format sort chronologically. Array#sort is stable,
  // so ties keep generation order and the output stays deterministic.
  drafts.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
  return drafts.map((draft, index) => ({
    id: `ORD-${String(index + 1).padStart(6, '0')}`,
    ...draft,
    customer: { ...draft.customer },
  }))
}
