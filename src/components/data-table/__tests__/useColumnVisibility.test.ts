import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ColumnLike } from '../model'
import { columnStorageKey, useColumnVisibility } from '../useColumnVisibility'

const COLUMNS: ColumnLike[] = [
  { id: 'select', meta: { label: 'Select', hideable: false } },
  { id: 'id', meta: { label: 'Order' } },
  { id: 'status', meta: { label: 'Status' } },
  { id: 'amount', meta: { label: 'Amount' } },
]
const KEY = columnStorageKey('orders')
const stored = () => window.localStorage.getItem(KEY)
const setup = () => renderHook(() => useColumnVisibility('orders', COLUMNS))

describe('useColumnVisibility', () => {
  it('shows everything by default and persists changes per table', () => {
    const { result, unmount } = setup()
    expect(result.current.state).toEqual({ select: true, id: true, status: true, amount: true })

    act(() => result.current.setVisible('status', false))
    expect(result.current.isVisible('status')).toBe(false)
    expect(JSON.parse(stored()!)).toEqual({ hidden: ['status'] })

    unmount()
    expect(setup().result.current.isVisible('status')).toBe(false) // read back on mount
  })

  it('falls back to the defaults on bad JSON or the wrong shape', () => {
    window.localStorage.setItem(KEY, '{not json')
    expect(setup().result.current.isVisible('status')).toBe(true)

    window.localStorage.setItem(KEY, JSON.stringify({ hidden: 'status' }))
    expect(setup().result.current.isVisible('status')).toBe(true)
  })

  it('ignores stored ids that no longer exist (or that are not hideable)', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ hidden: ['gone', 'select', 'amount'] }))
    const { result } = setup()
    expect(result.current.state).toEqual({ select: true, id: true, status: true, amount: false })
  })

  it('always shows non-hideable columns', () => {
    const { result } = setup()
    expect(result.current.canHide('select')).toBe(false)
    act(() => result.current.setVisible('select', false))
    expect(result.current.isVisible('select')).toBe(true)
  })

  it('never hides the last visible hideable column', () => {
    const { result } = setup()
    act(() => result.current.setVisible('id', false))
    act(() => result.current.setVisible('status', false))
    expect(result.current.canHide('amount')).toBe(false)

    act(() => result.current.setVisible('amount', false))
    expect(result.current.isVisible('amount')).toBe(true)
    // A stored state that hides them all (edited by hand) is reset too.
    window.localStorage.setItem(KEY, JSON.stringify({ hidden: ['id', 'status', 'amount'] }))
    expect(setup().result.current.isVisible('amount')).toBe(true)
  })

  it('applies a whole map with the same rules (the TanStack updater path)', () => {
    const { result } = setup()
    act(() => result.current.apply({ select: false, id: false }))
    expect(result.current.state).toEqual({ select: true, id: false, status: true, amount: true })
  })

  it('reset shows everything and forgets the preference', () => {
    const { result } = setup()
    act(() => result.current.setVisible('status', false))
    act(() => result.current.reset())
    expect(result.current.isVisible('status')).toBe(true)
    expect(stored()).toBeNull()
  })
})
