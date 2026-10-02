# URL state

A list's filters, sort, page, page size and search live in the URL, and only there. This page explains the store that makes that work: how params are read and written, when history entries are created, and why there is exactly one effect in the whole layer.

- **Adapters:** [`src/lib/url-state/adapter.ts`](../src/lib/url-state/adapter.ts)
- **Pure helpers:** [`src/lib/url-state/namespace.ts`](../src/lib/url-state/namespace.ts)
- **The hook:** [`src/lib/url-state/useListParams.ts`](../src/lib/url-state/useListParams.ts)
- **Updaters:** [`src/lib/url-state/listParamsActions.ts`](../src/lib/url-state/listParamsActions.ts)
- **Encoding rules:** [`src/contracts/list-params.ts`](../src/contracts/list-params.ts)
- **Demo:** Storybook → **Data/URL state** ([`src/dev/url-state-demo/`](../src/dev/url-state-demo/))

This is the first half of README hard problem #1 (shareable, back-button-correct list state). Stage 3b adds the other half: the query cache keyed on these params.

## The rule: the URL is the single source of truth

- Components **read** list params from the URL, through `useListParams`.
- User actions **write** to the URL, through `setParams`.
- No component copies URL state into `useState`, and no `useEffect` syncs URL ↔ state.

Two copies of the same state drift apart: Back updates the URL but not the copy, or a click updates the copy and the URL a render later. With one copy there is nothing to keep in sync. A shared link, a reload, Back and Forward all work, because they all just change the URL.

The one exception is input that isn't committed yet: the search box keeps the text being typed until the debounce fires. That draft isn't list state; the list doesn't see it until it's in the URL.

## Data flow

```
            ┌──────────────────────── user action ───────────────────────┐
            │                                                            │
            ▼                                                            │
  setParams(setSort('amount'))                                           │
            │                                                            │
            │  prev  = decode(adapter.getSearch())     ← read at call time│
            │  next  = applyParamsUpdate(prev, updater(prev))  (page rule)│
            │  equal key? → stop                                         │
            │  search = writeNamespace(current, ns, encodeSlice(next))   │
            ▼                                                            │
  adapter.navigate(search, 'push' | 'replace')                           │
            │   same string as now? → no-op (loop-breaker)               │
            │   history.pushState / replaceState, then notify()          │
            ▼                                                            │
  ┌───────────────────┐   Back / Forward (popstate) also notify          │
  │   URL (browser or │ ◄───────────────────────────────────────         │
  │   memory history) │                                                  │
  └─────────┬─────────┘                                                  │
            │ useSyncExternalStore(subscribe, getSearch)  → raw string   │
            ▼                                                            │
  readNamespace → decodeSlice (lenient) → key = listParamsKey(params)    │
            │                                                            │
            │ params = useMemo(…, [key])   ← stable identity             │
            ▼                                                            │
  { params, key, dropped }  ──► components render ───────────────────────┘
                            ──► query key (3b)
```

## Namespacing

Several lists share one query string, so each list owns the keys under its own prefix:

```
?orders.page=2&orders.f=status:in:paid&refunds.sort=amount&network=slow
 └──────── orders ──────────────────┘ └── refunds ───────┘ └─ foreign ─┘
```

- `readNamespace(search, 'orders')` returns only `orders.*` keys, prefix stripped (`page=2&f=status:in:paid`). The result is fed straight to the contract's `decodeListParams`.
- `writeNamespace(search, 'orders', slice)` removes every `orders.*` key and writes the new ones where the block was (at the end if it wasn't there). Every other key is kept byte-for-byte, in its original order. An empty result is `""`, never `"?"`.
- Namespaces can't contain `.`. Otherwise `orders` and `orders.archive` would both own `orders.archive.page`.
- Filter values keep `:` and `,` readable (`f=status:in:paid,shipped`, not `%3A…%2C`), since links are meant to be read and shared.

A list can override its default `pageSize` and `sort` (`useListParams('refunds', { defaults: { pageSize: 25 } })`). Defaults are left out of the URL, so the canonical slice is relative to that list's defaults. Page always defaults to 1. Filters and `q` can't have defaults, because an empty URL would then be ambiguous ("no filter" vs. "the default filter").

## Push vs. replace

| Change                               | History   | Why                                                                           |
| ------------------------------------ | --------- | ----------------------------------------------------------------------------- |
| Sort, filter, page, page size, Reset | `push`    | Each is a deliberate step the user may want to undo with Back.                |
| Search typing (debounced 300ms)      | `replace` | Keystrokes aren't steps; Back should leave the search, not delete one letter. |
| Canonicalization on load             | `replace` | Rewriting the spelling of the same state is not a step.                       |

`setParams` pushes by default; pass `{ history: 'replace' }` for search. Back and Forward are just the URL changing: every list re-reads its slice, and the controls follow.

## The page-reset rule

Changing **what** the list shows (filters, sort, `q` or page size) goes back to page 1. Page 3 of a different result set is meaningless.

`applyParamsUpdate(prev, next)` applies this to every update:

- If the update changed the page itself, the page is kept (so `setPage(4)` works, and so does an update that sets the page along with something else).
- Otherwise, if anything else changed, the page becomes 1.
- "Changed" is decided on the canonical encoding (`listParamsKey`), not object identity. Reordered filters or an untrimmed `q` aren't a change, so they don't reset the page.

The reset happens inside the same `setParams` call, so "change the filter on page 3" creates **one** history entry (`page` removed, filter added), not two.

`setParams` also reads `prev` from `adapter.getSearch()` at call time instead of the render's closure. Two calls in the same tick therefore compose: the second sees the first's write.

## Canonicalization on load

A link can spell a state many ways: filters shuffled, defaults written out (`orders.page=1`), duplicate values, invalid parts. The decoder accepts them all (leniently), but the URL should show one spelling per state, so shared links and history entries are comparable.

`useListParams` compares the raw slice in the URL with the canonical encoding of the params it decoded. If they differ, it rewrites the slice once, with `replace`. Invalid parts are dropped, and the hook returns them in `dropped` (they're remembered for that history entry, since the rewritten URL no longer contains them), for a hint like "1 invalid filter was removed from the link".

### Why it can't loop

- It acts only while `slice !== canonicalSlice`.
- Encoding is idempotent: decoding the canonical slice and encoding it again gives the same string. So after the rewrite, the next render sees `slice === canonicalSlice` and does nothing.
- Adapters ignore navigation to the URL they're already on: no history entry, no notification. If two hooks on the same namespace both see the messy URL in the same commit, the first rewrites it and the second computes the same URL and is a no-op.

Unit tests check this directly: a messy URL produces exactly one navigation (`navigateCount === 1`), and re-rendering produces none.

## Why there's no useEffect sync

The usual bug is a pair of effects: one copies the URL into state, the other writes state back to the URL. They run after paint (so there's a flash of stale UI), each triggers the other, and they need guards to avoid infinite loops.

Here there's no state to sync:

- **Reading** is `useSyncExternalStore`: React subscribes to the adapter and re-renders when the URL changes, during render, with no effect.
- **Writing** happens in event handlers (`setParams`), which call the adapter directly.
- The **one** effect is the canonicalization `useLayoutEffect` above. It's not a sync. It writes the URL to a better spelling of itself, it's guarded by a pure string comparison, and it runs before paint so the messy URL is never shown.

### Referential stability

The `useSyncExternalStore` snapshot is the raw search string: a primitive, so equality is a string compare. From it, `params` is memoized on the **canonical key** of this namespace, not the whole search string. Changing another namespace, `?network`, or the spelling of this one returns the same `params` object and the same `key`. Downstream `useMemo` deps and query keys see "no change", and do no work. (Identity is stable per hook instance; two instances get equal params and the same key.)

## Adapters

```ts
interface UrlAdapter {
  getSearch: () => string // "" or "?a=1&b=2"
  navigate: (search: string, mode: 'push' | 'replace') => void
  subscribe: (listener: () => void) => () => void
}
```

- **Browser** (`getBrowserAdapter()`, the default): `window.location.search` and `history.pushState` / `replaceState`, keeping the pathname and hash. `pushState` fires no event, so `navigate()` notifies subscribers itself; Back/Forward arrive as `popstate`.
- **Memory** (`createMemoryAdapter(initialSearch)`): an in-memory history stack for tests and Storybook, with `back()`, `forward()`, `entries`, `index` and `navigateCount` for asserting push vs. replace.

`<UrlStateProvider adapter?>` supplies it. The demo app uses the browser adapter (in `main.tsx`); `renderWithProviders` and the Storybook preview use a fresh memory adapter per test or story (`parameters.url` sets its initial URL, and `storyUrl(loaded)` gives play functions access to it).

### A Next.js adapter

The hooks only see the interface, so a router plugs in by implementing it.

**App Router (Next 14.1+): the browser adapter works as-is.** Next integrates native `window.history.pushState` / `replaceState` with its router (`useSearchParams` and `usePathname` stay in sync), and these calls are synchronous, so rapid `setParams` calls still compose. Wrap the client tree in `<UrlStateProvider>` and that's it. Search params are client-side list state here, so no server round trip happens on each click.

**When navigation must go through the router** (to re-run server components with the new params, for example), implement the interface over it:

```tsx
'use client'
function NextRouterUrlState({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams().toString() // re-renders on every navigation
  const listeners = useRef(new Set<() => void>())

  // Next tells us about navigations by re-rendering; forward that to subscribers.
  useLayoutEffect(() => listeners.current.forEach((listener) => listener()), [search])

  const adapter = useMemo<UrlAdapter>(
    () => ({
      getSearch: () => window.location.search,
      navigate: (next, mode) => {
        if (next === window.location.search) return // loop-breaker
        router[mode](`${pathname}${next}`, { scroll: false })
      },
      subscribe: (listener) => {
        listeners.current.add(listener)
        return () => listeners.current.delete(listener)
      },
    }),
    [router, pathname],
  )

  return <UrlStateProvider adapter={adapter}>{children}</UrlStateProvider>
}
```

The trade-off: `router.push` updates the URL asynchronously (in a transition), so two `setParams` calls in the same tick no longer compose. Funnel multi-part changes through one updater. For server rendering, give `useSyncExternalStore` a `getServerSnapshot` that returns the request's search string, so the first client render matches the server's.
