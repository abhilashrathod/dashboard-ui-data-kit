import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COALESCE_MS, createAnnouncer, type Politeness } from './scheduler'

describe('announcer scheduling', () => {
  let writes: [Politeness, string][]
  let frames: (() => void)[]
  const runFrame = () => frames.splice(0).forEach((callback) => callback())

  const setup = () =>
    createAnnouncer({
      write: (politeness, text) => writes.push([politeness, text]),
      nextFrame: (callback) => frames.push(callback),
    })

  beforeEach(() => {
    vi.useFakeTimers()
    writes = []
    frames = []
  })
  afterEach(() => vi.useRealTimers())

  it('clears the region, then sets the message on the next frame', () => {
    const announcer = setup()
    announcer.announce('Sorted by amount')
    expect(writes).toEqual([])

    vi.advanceTimersByTime(COALESCE_MS)
    expect(writes).toEqual([['polite', '']])

    runFrame()
    expect(writes).toEqual([
      ['polite', ''],
      ['polite', 'Sorted by amount'],
    ])
  })

  it('re-announces an identical message (clear-then-set makes it a change)', () => {
    const announcer = setup()
    for (let i = 0; i < 2; i += 1) {
      announcer.announce('12 results')
      vi.advanceTimersByTime(COALESCE_MS)
      runFrame()
    }
    expect(writes).toEqual([
      ['polite', ''],
      ['polite', '12 results'],
      ['polite', ''],
      ['polite', '12 results'],
    ])
  })

  it('coalesces rapid calls: the last one wins', () => {
    const announcer = setup()
    announcer.announce('1 result')
    vi.advanceTimersByTime(50)
    announcer.announce('2 results')
    vi.advanceTimersByTime(50)
    announcer.announce('3 results', { politeness: 'assertive' })
    vi.advanceTimersByTime(COALESCE_MS)
    runFrame()
    expect(writes).toEqual([
      ['assertive', ''],
      ['assertive', '3 results'],
    ])
  })

  it('lets a newer flush supersede a pending frame', () => {
    const announcer = setup()
    announcer.announce('first')
    vi.advanceTimersByTime(COALESCE_MS)
    announcer.announce('second')
    vi.advanceTimersByTime(COALESCE_MS)
    runFrame()
    expect(writes.filter(([, text]) => text !== '')).toEqual([['polite', 'second']])
  })

  it('cancel drops anything pending', () => {
    const announcer = setup()
    announcer.announce('never')
    announcer.cancel()
    vi.advanceTimersByTime(COALESCE_MS)
    runFrame()
    expect(writes).toEqual([])
  })
})
