import { describe, expect, it } from 'vitest'
import type { BulkStatusUpdateResult } from '@/contracts'
import { makeOrder } from '@/mocks/query/__tests__/makeOrder'
import { summarizeBulkResult } from '../summarizeBulkResult'

const updated = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    makeOrder({ id: `ORD-${String(index + 1).padStart(6, '0')}` }),
  )
const failed = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `ORD-9${String(index).padStart(5, '0')}`,
    reason: "Can't move refunded → shipped",
  }))
const result = (u: number, f: number): BulkStatusUpdateResult => ({
  updated: updated(u),
  failed: failed(f),
})

describe('summarizeBulkResult', () => {
  it('all updated → a success toast, no details', () => {
    expect(summarizeBulkResult(result(3, 0), 'shipped')).toEqual({
      title: '3 orders marked as shipped',
      tone: 'success',
      details: false,
    })
  })

  it('partial → a default toast with details', () => {
    expect(summarizeBulkResult(result(2, 1), 'shipped')).toEqual({
      title: "2 updated, 1 couldn't be changed",
      description: '2 orders marked as shipped. The other one is still selected.',
      tone: 'default',
      details: true,
    })
    expect(summarizeBulkResult(result(1, 4), 'paid').description).toBe(
      '1 order marked as paid. The others are still selected.',
    )
  })

  it('none updated → a danger toast with details', () => {
    expect(summarizeBulkResult(result(0, 3), 'refunded')).toEqual({
      title: 'No orders could be changed',
      description: "None of the 3 orders can be marked as refunded. They're still selected.",
      tone: 'danger',
      details: true,
    })
    expect(summarizeBulkResult(result(0, 1), 'refunded').description).toBe(
      "The order can't be marked as refunded. It's still selected.",
    )
  })

  it('pluralizes and groups digits', () => {
    expect(summarizeBulkResult(result(1, 0), 'paid').title).toBe('1 order marked as paid')
    expect(summarizeBulkResult(result(1204, 0), 'paid').title).toBe('1,204 orders marked as paid')
  })
})
