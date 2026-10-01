import { describe, expect, it } from 'vitest'
import { db, emptyDb, resetDb } from '../db'
import { generateOrders } from '../generateOrders'

const ANCHOR = new Date('2026-09-30T00:00:00Z')

describe('db', () => {
  it('is seeded on import', () => {
    expect(db.orders).toHaveLength(10_000)
  })

  it('resetDb regenerates in place, keeping the array identity', () => {
    const array = db.orders
    resetDb({ seed: 5, count: 100, anchor: ANCHOR })

    expect(db.orders).toBe(array)
    expect(db.orders).toStrictEqual(generateOrders({ seed: 5, count: 100, anchor: ANCHOR }))
  })

  it('emptyDb clears the orders', () => {
    resetDb({ count: 10, anchor: ANCHOR })
    emptyDb()
    expect(db.orders).toEqual([])
  })
})
