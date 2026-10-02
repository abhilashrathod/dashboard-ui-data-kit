import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDelayedFlag } from '../useDelayedFlag'

const setup = (active = false) =>
  renderHook(({ active }) => useDelayedFlag(active), { initialProps: { active } })

describe('useDelayedFlag (delay 150, minDuration 300)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // Synchronous act: the returned thenable only matters for async callbacks.
  const advance = (ms: number) => {
    void act(() => {
      vi.advanceTimersByTime(ms)
    })
  }

  it('never shows for a fast load (< 150ms)', () => {
    const { result, rerender } = setup(true)
    advance(140)
    rerender({ active: false })
    advance(1000)
    expect(result.current).toBe(false)
  })

  it('shows after 150ms for a slow load', () => {
    const { result } = setup(true)
    advance(149)
    expect(result.current).toBe(false)
    advance(1)
    expect(result.current).toBe(true)
  })

  it('once shown, stays at least 300ms', () => {
    const { result, rerender } = setup(true)
    advance(150) // shown at t=150
    advance(50) // t=200: the load finishes
    rerender({ active: false })
    advance(249) // t=449
    expect(result.current).toBe(true)
    advance(1) // t=450 = 150 + 300
    expect(result.current).toBe(false)
  })

  it('hides immediately when it has already been shown for 300ms', () => {
    const { result, rerender } = setup(true)
    advance(150 + 500)
    rerender({ active: false })
    advance(0)
    expect(result.current).toBe(false)
  })

  it('stays shown if active turns back on during the minimum', () => {
    const { result, rerender } = setup(true)
    advance(150)
    rerender({ active: false })
    advance(100)
    rerender({ active: true })
    advance(1000)
    expect(result.current).toBe(true)
  })

  it('clears its timers on unmount', () => {
    const { unmount } = setup(true)
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
