import { describe, expect, it } from 'vitest'
import { DEFAULT_LIST_PARAMS, type ListParams } from '@/contracts'
import {
  applyParamsUpdate,
  decodeSlice,
  encodeSlice,
  readNamespace,
  resolveDefaults,
  writeNamespace,
} from '../namespace'

const MIXED = '?network=slow&orders.page=2&refunds.sort=amount&orders.f=status:in:paid&theme=dark'

describe('readNamespace', () => {
  it('returns only this namespace, prefix stripped', () => {
    expect([...readNamespace(MIXED, 'orders')]).toEqual([
      ['page', '2'],
      ['f', 'status:in:paid'],
    ])
    expect([...readNamespace(MIXED, 'refunds')]).toEqual([['sort', 'amount']])
    expect([...readNamespace(MIXED, 'customers')]).toEqual([])
  })

  it('decodes percent-encoded values', () => {
    expect(readNamespace('?orders.f=status%3Ain%3Apaid', 'orders').get('f')).toBe('status:in:paid')
  })

  it('rejects namespaces that could collide', () => {
    expect(() => readNamespace('', 'orders.archive')).toThrow(/Invalid URL-state namespace/)
    expect(() => readNamespace('', '')).toThrow(/Invalid URL-state namespace/)
  })
})

describe('writeNamespace', () => {
  it('replaces the namespace in place and keeps every other key', () => {
    const next = writeNamespace(MIXED, 'orders', new URLSearchParams([['sort', 'amount']]))
    expect(next).toBe('?network=slow&orders.sort=amount&refunds.sort=amount&theme=dark')
  })

  it('preserves foreign keys byte-for-byte and in order', () => {
    const search = '?z=1&a=%7Bx%7D&orders.page=2&m=a+b&b'
    expect(writeNamespace(search, 'orders', new URLSearchParams([['page', '3']]))).toBe(
      '?z=1&a=%7Bx%7D&orders.page=3&m=a+b&b',
    )
  })

  it('appends the namespace when it was absent', () => {
    expect(writeNamespace('?network=slow', 'orders', new URLSearchParams([['page', '2']]))).toBe(
      '?network=slow&orders.page=2',
    )
  })

  it('writes keys in their given order, with readable filter values', () => {
    const ns = new URLSearchParams([
      ['page', '2'],
      ['q', 'a&b c'],
      ['f', 'channel:in:mobile,web'],
      ['f', 'createdAt:between:2026-01-01..2026-02-01'],
    ])
    expect(writeNamespace('', 'orders', ns)).toBe(
      '?orders.page=2&orders.q=a%26b%20c&orders.f=channel:in:mobile,web&orders.f=createdAt:between:2026-01-01..2026-02-01',
    )
  })

  it('returns "" (not "?") when nothing is left', () => {
    expect(writeNamespace('?orders.page=2', 'orders', new URLSearchParams())).toBe('')
    expect(writeNamespace('', 'orders', new URLSearchParams())).toBe('')
    expect(writeNamespace('?', 'orders', new URLSearchParams())).toBe('')
  })

  it('round-trips through readNamespace', () => {
    const ns = new URLSearchParams([
      ['sort', '-amount'],
      ['q', 'ünïcode & "quotes" + plus'],
      ['f', 'status:in:paid,shipped'],
    ])
    const written = writeNamespace(MIXED, 'orders', ns)
    expect(readNamespace(written, 'orders').toString()).toBe(ns.toString())
    expect(readNamespace(written, 'refunds').toString()).toBe('sort=amount')
    expect(new URLSearchParams(written).get('network')).toBe('slow')
  })
})

describe('decodeSlice / encodeSlice with per-list defaults', () => {
  const defaults = resolveDefaults({ pageSize: 25, sort: 'amount' })

  it('uses the list defaults for missing or invalid size and sort', () => {
    expect(decodeSlice(new URLSearchParams(), defaults).params).toMatchObject({
      pageSize: 25,
      sort: 'amount',
    })
    const { params, dropped } = decodeSlice(new URLSearchParams('size=abc&sort=nope'), defaults)
    expect(params).toMatchObject({ pageSize: 25, sort: 'amount' })
    expect(dropped).toHaveLength(2)
  })

  it('omits list defaults and writes global defaults that differ from them', () => {
    expect(
      encodeSlice({ ...DEFAULT_LIST_PARAMS, pageSize: 25, sort: 'amount' }, defaults).toString(),
    ).toBe('')
    expect(encodeSlice({ ...DEFAULT_LIST_PARAMS }, defaults).toString()).toBe(
      'size=50&sort=-createdAt',
    )
  })
})

describe('applyParamsUpdate', () => {
  const onPage3: ListParams = { ...DEFAULT_LIST_PARAMS, page: 3, filters: [] }

  it('resets the page when a filter changes', () => {
    const next = applyParamsUpdate(onPage3, {
      ...onPage3,
      filters: [{ field: 'status', op: 'in', value: ['paid'] }],
    })
    expect(next.page).toBe(1)
  })

  it.each<[string, Partial<ListParams>]>([
    ['sort', { sort: 'amount' }],
    ['q', { q: 'acme' }],
    ['pageSize', { pageSize: 100 }],
  ])('resets the page when %s changes', (_, change) => {
    expect(applyParamsUpdate(onPage3, { ...onPage3, ...change }).page).toBe(1)
  })

  it('keeps an explicit page change', () => {
    expect(applyParamsUpdate(onPage3, { ...onPage3, page: 4 }).page).toBe(4)
    expect(applyParamsUpdate(onPage3, { ...onPage3, page: 5, sort: 'amount' }).page).toBe(5)
  })

  it('returns the same params when nothing changed', () => {
    expect(applyParamsUpdate(onPage3, onPage3)).toBe(onPage3)
  })

  it('compares canonically: reordered filters or an untrimmed q are not a change', () => {
    const prev: ListParams = {
      ...onPage3,
      q: 'acme',
      filters: [
        { field: 'status', op: 'in', value: ['paid', 'failed'] },
        { field: 'channel', op: 'in', value: ['web'] },
      ],
    }
    const next: ListParams = {
      ...prev,
      q: '  acme ',
      filters: [
        { field: 'channel', op: 'in', value: ['web'] },
        { field: 'status', op: 'in', value: ['failed', 'paid'] },
      ],
    }
    expect(applyParamsUpdate(prev, next).page).toBe(3)
  })
})
