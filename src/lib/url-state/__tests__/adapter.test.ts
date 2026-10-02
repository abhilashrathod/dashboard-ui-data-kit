import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBrowserAdapter, createMemoryAdapter } from '../adapter'

describe('memory adapter', () => {
  it('push adds an entry; replace rewrites the current one', () => {
    const adapter = createMemoryAdapter('?a=1')
    adapter.navigate('?a=2', 'push')
    adapter.navigate('?a=3', 'replace')
    expect(adapter.entries).toEqual(['?a=1', '?a=3'])
    expect(adapter.index).toBe(1)
    expect(adapter.getSearch()).toBe('?a=3')
    expect(adapter.navigateCount).toBe(2)
  })

  it('normalizes "?" and a missing "?"', () => {
    const adapter = createMemoryAdapter('?')
    expect(adapter.getSearch()).toBe('')
    adapter.navigate('a=1', 'push')
    expect(adapter.getSearch()).toBe('?a=1')
  })

  it('goes back and forward, notifying subscribers', () => {
    const adapter = createMemoryAdapter()
    adapter.navigate('?a=1', 'push')
    adapter.navigate('?a=2', 'push')
    const listener = vi.fn()
    adapter.subscribe(listener)

    adapter.back()
    expect(adapter.getSearch()).toBe('?a=1')
    adapter.back()
    expect(adapter.getSearch()).toBe('')
    adapter.back() // already at the start
    expect(adapter.getSearch()).toBe('')
    adapter.forward()
    expect(adapter.getSearch()).toBe('?a=1')
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('a push after Back drops the forward entries', () => {
    const adapter = createMemoryAdapter()
    adapter.navigate('?a=1', 'push')
    adapter.navigate('?a=2', 'push')
    adapter.back()
    adapter.navigate('?b=1', 'push')
    expect(adapter.entries).toEqual(['', '?a=1', '?b=1'])
  })

  it('ignores navigation to the current search (no entry, no notify, not counted)', () => {
    const adapter = createMemoryAdapter('?a=1')
    const listener = vi.fn()
    adapter.subscribe(listener)
    adapter.navigate('?a=1', 'push')
    adapter.navigate('a=1', 'replace')
    expect(adapter.entries).toEqual(['?a=1'])
    expect(adapter.navigateCount).toBe(0)
    expect(listener).not.toHaveBeenCalled()
  })

  it('stops notifying after unsubscribe', () => {
    const adapter = createMemoryAdapter()
    const listener = vi.fn()
    const unsubscribe = adapter.subscribe(listener)
    unsubscribe()
    adapter.navigate('?a=1', 'push')
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('browser adapter (jsdom)', () => {
  beforeEach(() => window.history.replaceState(null, '', '/orders#top'))
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('push updates location (keeping pathname and hash) and notifies', () => {
    const adapter = createBrowserAdapter()
    const listener = vi.fn()
    adapter.subscribe(listener)
    const length = window.history.length

    adapter.navigate('?orders.page=2', 'push')

    expect(window.location.pathname).toBe('/orders')
    expect(window.location.search).toBe('?orders.page=2')
    expect(window.location.hash).toBe('#top')
    expect(adapter.getSearch()).toBe('?orders.page=2')
    expect(window.history.length).toBe(length + 1)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('replace does not add a history entry', () => {
    const adapter = createBrowserAdapter()
    const length = window.history.length
    adapter.navigate('?q=a', 'replace')
    expect(window.location.search).toBe('?q=a')
    expect(window.history.length).toBe(length)
  })

  it('ignores navigation to the current search', () => {
    const adapter = createBrowserAdapter()
    adapter.navigate('?a=1', 'replace')
    const listener = vi.fn()
    adapter.subscribe(listener)
    adapter.navigate('?a=1', 'push')
    expect(listener).not.toHaveBeenCalled()
  })

  it('notifies subscribers on popstate, until they unsubscribe', () => {
    const adapter = createBrowserAdapter()
    const listener = vi.fn()
    const unsubscribe = adapter.subscribe(listener)

    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
