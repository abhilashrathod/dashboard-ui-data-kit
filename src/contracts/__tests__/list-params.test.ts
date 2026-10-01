import { describe, expect, it } from 'vitest'
import {
  decodeListParams,
  DEFAULT_LIST_PARAMS,
  encodeListParams,
  type Filter,
  ListParams,
  listParamsKey,
  withDefaults,
} from '@/contracts'

const strict = (query: string) => decodeListParams(new URLSearchParams(query), { mode: 'strict' })
const lenient = (query: string) => decodeListParams(new URLSearchParams(query), { mode: 'lenient' })

/** One filter of every type, already in canonical order (field, then op). */
const EVERY_FILTER: Filter[] = [
  { field: 'amount', op: 'between', value: [100, 900] },
  { field: 'amount', op: 'gt', value: 500 },
  { field: 'amount', op: 'lt', value: 1999.99 },
  { field: 'channel', op: 'in', value: ['mobile', 'web'] },
  { field: 'createdAt', op: 'between', value: ['2026-01-01', '2026-03-31'] },
  { field: 'status', op: 'in', value: ['paid', 'refunded'] },
]

describe('round trip: encode → decode(strict)', () => {
  it.each<[string, ListParams]>([
    ['defaults only', withDefaults()],
    ['every filter type', withDefaults({ filters: EVERY_FILTER })],
    ['q with spaces and special characters', withDefaults({ q: 'Acme & Sons = "best" co. 100%' })],
    ['page + size', withDefaults({ page: 3, pageSize: 100 })],
    ['page + ascending sort', withDefaults({ page: 2, sort: 'amount' })],
    [
      'boundaries: max size, negative and decimal amounts',
      withDefaults({
        pageSize: 500,
        sort: '-customer',
        filters: [
          { field: 'amount', op: 'between', value: [-10, 10.25] },
          { field: 'amount', op: 'gt', value: 0.5 },
        ],
      }),
    ],
  ])('%s', (_name, params) => {
    const decoded = decodeListParams(encodeListParams(params), { mode: 'strict' })
    expect(decoded).toStrictEqual({ ok: true, params })
  })

  it('special characters in q (&, =, +, %, #, ?, spaces, unicode) survive', () => {
    const q = 'a&b=c d+e %20 #frag ?x café ☕ 東京 👍🏽'
    const decoded = strict(listParamsKey(withDefaults({ q })))
    expect(decoded.ok && decoded.params.q).toBe(q)
  })
})

describe('canonical encoding', () => {
  it('defaults encode to an empty string', () => {
    expect(listParamsKey(withDefaults())).toBe('')
    expect(listParamsKey({ ...DEFAULT_LIST_PARAMS, q: '   ' })).toBe('')
  })

  it('shuffled filters and duplicate `in` values give an identical string', () => {
    const canonical = listParamsKey(withDefaults({ filters: EVERY_FILTER }))
    const shuffled = listParamsKey(
      withDefaults({
        filters: [
          { field: 'status', op: 'in', value: ['refunded', 'paid', 'refunded'] },
          { field: 'createdAt', op: 'between', value: ['2026-01-01', '2026-03-31'] },
          { field: 'amount', op: 'lt', value: 1999.99 },
          { field: 'channel', op: 'in', value: ['web', 'mobile', 'web'] },
          { field: 'amount', op: 'gt', value: 500 },
          { field: 'amount', op: 'between', value: [100, 900] },
          { field: 'amount', op: 'gt', value: 500 }, // exact duplicate filter
        ],
      }),
    )
    expect(shuffled).toBe(canonical)
  })

  it('uses the fixed key order page, size, sort, q, f', () => {
    const key = listParamsKey({
      filters: [
        { field: 'status', op: 'in', value: ['paid', 'refunded'] },
        { field: 'amount', op: 'gt', value: 500 },
      ],
      q: '  acme  ',
      sort: '-amount',
      pageSize: 25,
      page: 2,
    })
    expect(key).toBe(
      'page=2&size=25&sort=-amount&q=acme&f=amount%3Agt%3A500&f=status%3Ain%3Apaid%2Crefunded',
    )
  })

  it('decoding a non-canonical URL yields canonical params', () => {
    const decoded = strict('f=status:in:refunded,paid,paid&f=amount:gt:500')
    expect(decoded).toStrictEqual({
      ok: true,
      params: withDefaults({
        filters: [
          { field: 'amount', op: 'gt', value: 500 },
          { field: 'status', op: 'in', value: ['paid', 'refunded'] },
        ],
      }),
    })
  })
})

describe('strict mode rejects', () => {
  it.each([
    [
      'an unknown field',
      'f=foo:in:a',
      'f[0] "foo:in:a": unknown field "foo" (allowed: amount, channel, createdAt, status)',
    ],
    [
      'the wrong op for a field',
      'f=amount:in:5',
      'f[0] "amount:in:5": op "in" not allowed for amount (allowed: gt, lt, between)',
    ],
    [
      'an invalid enum value',
      'f=status:in:paid,lost',
      'f[0] "status:in:paid,lost": "lost" is not a valid status (expected one of: pending, paid, shipped, refunded, failed)',
    ],
    [
      'between with min > max',
      'f=amount:between:900..100',
      'f[0] "amount:between:900..100": min must be <= max',
    ],
    [
      'dates out of order',
      'f=createdAt:between:2026-03-31..2026-01-01',
      'f[0] "createdAt:between:2026-03-31..2026-01-01": from must be on or before to',
    ],
    [
      'a bad date',
      'f=createdAt:between:2026-13-01..2026-03-31',
      'f[0] "createdAt:between:2026-13-01..2026-03-31": "2026-13-01" is not a valid yyyy-mm-dd date',
    ],
    ['pageSize 1000', 'size=1000', 'size "1000": must be an integer between 1 and 500'],
    ['page 0', 'page=0', 'page "0": must be an integer >= 1'],
    ['a non-numeric amount', 'f=amount:gt:abc', 'f[0] "amount:gt:abc": "abc" is not a number'],
    ['a malformed filter', 'f=amount', 'f[0] "amount": expected field:op:value'],
    [
      'an unknown sort',
      'sort=-price',
      'sort "-price": must be one of createdAt, amount, customer, status, optionally prefixed with "-"',
    ],
    ['a repeated scalar', 'page=1&page=2', 'page: given 2 times, expected once'],
  ])('%s', (_name, query, issue) => {
    expect(strict(query)).toStrictEqual({ ok: false, issues: [issue] })
  })

  it('reports one issue per problem, in order', () => {
    const result = strict('page=0&f=status:in:paid&f=amount:in:5&f=channel:in:fax')
    expect(result.ok).toBe(false)
    expect(!result.ok && result.issues).toEqual([
      'page "0": must be an integer >= 1',
      'f[1] "amount:in:5": op "in" not allowed for amount (allowed: gt, lt, between)',
      'f[2] "channel:in:fax": "fax" is not a valid channel (expected one of: web, mobile, marketplace, pos)',
    ])
  })
})

describe('lenient mode', () => {
  it('keeps good filters, drops the bad one, and falls back on a garbage page', () => {
    const result = lenient('page=abc&f=status:in:paid&f=amount:gt:oops&f=channel:in:web')

    expect(result.ok).toBe(true)
    expect(result.params).toStrictEqual(
      withDefaults({
        page: 1,
        filters: [
          { field: 'channel', op: 'in', value: ['web'] },
          { field: 'status', op: 'in', value: ['paid'] },
        ],
      }),
    )
    expect(result.dropped).toEqual([
      'page "abc": must be an integer >= 1',
      'f[1] "amount:gt:oops": "oops" is not a number',
    ])
  })

  it('falls back to defaults for out-of-range scalars', () => {
    const result = lenient('page=0&size=9999&sort=nope')
    expect(result.params).toStrictEqual(withDefaults())
    expect(result.dropped).toHaveLength(3)
  })
})

describe('both modes', () => {
  it('ignore unknown keys', () => {
    const query = 'utm_source=newsletter&page=2&debug'
    expect(strict(query)).toStrictEqual({ ok: true, params: withDefaults({ page: 2 }) })
    expect(lenient(query)).toStrictEqual({
      ok: true,
      params: withDefaults({ page: 2 }),
      dropped: [],
    })
  })

  it('never throw, and always produce valid ListParams', () => {
    const junk = [
      '',
      '&&&',
      '=',
      'f=',
      'f=::',
      'f=amount:between:..',
      'f=amount:between:1..2..3',
      'f=status:in:,',
      'f=constructor:in:x',
      'f=__proto__:in:x',
      'f=amount:gt:Infinity',
      'f=amount:gt:0x10',
      'page=1e3&size=-1',
      'page=99999999999999999999',
      `q=${'x'.repeat(500)}`,
      'f=createdAt:between:2026-02-30..2026-03-01',
      '%E0%A4%A',
    ]
    for (const query of junk) {
      expect(() => strict(query)).not.toThrow()
      const result = lenient(query)
      expect(ListParams.safeParse(result.params).success).toBe(true)
    }
  })
})

describe('withDefaults', () => {
  it('fills missing and undefined keys without sharing the defaults array', () => {
    const params = withDefaults({ page: undefined, sort: 'amount' })
    expect(params).toStrictEqual({ page: 1, pageSize: 50, sort: 'amount', filters: [] })
    expect(params.filters).not.toBe(DEFAULT_LIST_PARAMS.filters)
  })
})
