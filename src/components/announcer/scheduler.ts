/*
 * The scheduling behind useAnnounce(), kept free of React and the DOM so it can
 * be tested with fake timers.
 *
 * 1. Coalesce: calls within `coalesceMs` of each other collapse into one; the
 *    last message wins. (Typing in a filter shouldn't queue ten announcements.)
 * 2. Clear, then set on the next frame: live regions only speak on a change, so
 *    re-announcing the same text ("12 results" twice) needs an empty step first.
 */

export type Politeness = 'polite' | 'assertive'

export interface AnnouncerOptions {
  /** Writes text into the live region for `politeness`. */
  write: (politeness: Politeness, text: string) => void
  coalesceMs?: number
  /** Defaults to requestAnimationFrame; injectable for tests. */
  nextFrame?: (callback: () => void) => void
}

export interface Announcer {
  announce: (message: string, options?: { politeness?: Politeness }) => void
  /** Cancels anything pending (on unmount). */
  cancel: () => void
}

export const COALESCE_MS = 150

export function createAnnouncer({
  write,
  coalesceMs = COALESCE_MS,
  nextFrame = (callback) => requestAnimationFrame(callback),
}: AnnouncerOptions): Announcer {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: { message: string; politeness: Politeness } | undefined
  let generation = 0

  const flush = () => {
    timer = undefined
    if (!pending) return
    const { message, politeness } = pending
    pending = undefined
    const current = ++generation
    write(politeness, '')
    nextFrame(() => {
      // A newer flush (or cancel) supersedes this one.
      if (current === generation) write(politeness, message)
    })
  }

  return {
    announce(message, { politeness = 'polite' } = {}) {
      pending = { message, politeness }
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(flush, coalesceMs)
    },
    cancel() {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
      pending = undefined
      generation += 1
    },
  }
}
