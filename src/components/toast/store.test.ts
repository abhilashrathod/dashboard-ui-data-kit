import { describe, expect, it, vi } from 'vitest'
import { createToastStore, DANGER_DURATION, DEFAULT_DURATION } from './store'

const open = (store: ReturnType<typeof createToastStore>) =>
  store.getSnapshot().filter((toast) => toast.open)

describe('toast store', () => {
  it('adds toasts with unique ids and tone-based durations', () => {
    const store = createToastStore()
    const a = store.add({ title: 'Saved' })
    const b = store.add({ title: 'Failed', tone: 'danger' })
    const c = store.add({ title: 'Custom', duration: 1000 })

    expect(new Set([a, b, c]).size).toBe(3)
    const [first, second, third] = store.getSnapshot()
    expect(first).toMatchObject({ id: a, tone: 'default', duration: DEFAULT_DURATION, open: true })
    expect(second).toMatchObject({ id: b, tone: 'danger', duration: DANGER_DURATION })
    expect(third).toMatchObject({ id: c, duration: 1000 })
  })

  it('dismisses by id (closed, kept for the exit animation)', () => {
    const store = createToastStore()
    const id = store.add({ title: 'Saved' })
    store.dismiss(id)
    expect(store.getSnapshot()).toEqual([expect.objectContaining({ id, open: false })])
    expect(open(store)).toHaveLength(0)
  })

  it('keeps at most 3 open, closing the oldest', () => {
    const store = createToastStore()
    const ids = Array.from({ length: 5 }, (_, index) => store.add({ title: `Toast ${index + 1}` }))
    expect(open(store).map((toast) => toast.id)).toEqual(ids.slice(2))
  })

  it('prunes closed toasts on the next add', () => {
    const store = createToastStore()
    const first = store.add({ title: 'One' })
    store.dismiss(first)
    store.add({ title: 'Two' })
    expect(store.getSnapshot().map((toast) => toast.title)).toEqual(['Two'])
  })

  it('notifies subscribers, and not for no-op dismisses', () => {
    const store = createToastStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    const id = store.add({ title: 'Saved' })
    store.dismiss(id)
    store.dismiss(id)
    store.dismiss('unknown')
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    store.add({ title: 'Again' })
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
