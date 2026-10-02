/**
 * Where the URL lives. The URL-state hooks only ever talk to this interface,
 * so the same code runs on the real browser history, an in-memory history
 * (tests, Storybook), or a router's API (see docs/url-state.md for Next.js).
 */
export interface UrlAdapter {
  // Function-typed properties, not methods: callers pass them around unbound
  // (useSyncExternalStore(adapter.subscribe, adapter.getSearch)).
  /** The current query string: "" or "?a=1&b=2". */
  getSearch: () => string
  /** Go to `search` (same pathname and hash). Push adds a history entry; replace rewrites the current one. */
  navigate: (search: string, mode: 'push' | 'replace') => void
  /** Called after every navigation, including Back/Forward. Returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void
}

/** "" and "?" both mean "no query"; a missing "?" is added. */
export function normalizeSearch(search: string): string {
  if (search === '' || search === '?') return ''
  return search.startsWith('?') ? search : `?${search}`
}

function createListeners() {
  const listeners = new Set<() => void>()
  return {
    listeners,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    notify: () => {
      for (const listener of [...listeners]) listener()
    },
  }
}

// ── Browser ──────────────────────────────────────────────────────────────────

/** window.location + the History API. Keeps pathname and hash on every navigation. */
export function createBrowserAdapter(): UrlAdapter {
  const { listeners, notify, subscribe } = createListeners()

  // One popstate listener per adapter, attached while anyone is subscribed.
  const onPopState = () => notify()

  return {
    getSearch: () => normalizeSearch(window.location.search),

    navigate(search, mode) {
      const next = normalizeSearch(search)
      // Loop-breaker: navigating to the URL we're already on adds no history
      // entry and notifies no one, so "write what you read" can never cycle.
      if (next === normalizeSearch(window.location.search)) return

      const { pathname, hash } = window.location
      const url = `${pathname}${next}${hash}`
      if (mode === 'push') window.history.pushState(null, '', url)
      else window.history.replaceState(window.history.state, '', url)
      // pushState/replaceState fire no event, so subscribers are told here.
      notify()
    },

    subscribe(listener) {
      if (listeners.size === 0) window.addEventListener('popstate', onPopState)
      const unsubscribe = subscribe(listener)
      return () => {
        unsubscribe()
        if (listeners.size === 0) window.removeEventListener('popstate', onPopState)
      }
    },
  }
}

let browserAdapter: UrlAdapter | undefined

/** The app-wide browser adapter, created on first use. */
export function getBrowserAdapter(): UrlAdapter {
  browserAdapter ??= createBrowserAdapter()
  return browserAdapter
}

// ── Memory ───────────────────────────────────────────────────────────────────

export interface MemoryUrlAdapter extends UrlAdapter {
  /** Every history entry's search string, oldest first. */
  readonly entries: readonly string[]
  /** Position of the current entry in `entries`. */
  readonly index: number
  /** Navigations that actually happened (no-ops on an equal search aren't counted). */
  readonly navigateCount: number
  back: () => void
  forward: () => void
}

/** An in-memory history stack for tests and Storybook. Back/Forward notify like popstate does. */
export function createMemoryAdapter(initialSearch = ''): MemoryUrlAdapter {
  const { notify, subscribe } = createListeners()
  const entries = [normalizeSearch(initialSearch)]
  let index = 0
  let navigateCount = 0

  const go = (delta: number) => {
    const target = index + delta
    if (target < 0 || target >= entries.length) return
    index = target
    notify()
  }

  return {
    getSearch: () => entries[index] ?? '',

    navigate(search, mode) {
      const next = normalizeSearch(search)
      // Loop-breaker: same as the browser adapter. Equal search → no entry, no notify.
      if (next === entries[index]) return

      if (mode === 'push') {
        entries.splice(index + 1, entries.length, next)
        index += 1
      } else {
        entries[index] = next
      }
      navigateCount += 1
      notify()
    },

    subscribe,
    back: () => go(-1),
    forward: () => go(1),

    get entries() {
      return [...entries]
    },
    get index() {
      return index
    },
    get navigateCount() {
      return navigateCount
    },
  }
}

export function isMemoryAdapter(adapter: UrlAdapter): adapter is MemoryUrlAdapter {
  return 'back' in adapter && 'entries' in adapter
}
