# URL state

A list's filters, sort, page, page size and search live in the URL, and only there. This page explains the store that makes that work: how params are read and written, when history entries are created, and why there is exactly one effect in the whole layer.

- **Adapters:** [`src/lib/url-state/adapter.ts`](../src/lib/url-state/adapter.ts)
- **Pure helpers:** [`src/lib/url-state/namespace.ts`](../src/lib/url-state/namespace.ts)
- **The hook:** [`src/lib/url-state/useListParams.ts`](../src/lib/url-state/useListParams.ts)
- **Updaters:** [`src/lib/url-state/listParamsActions.ts`](../src/lib/url-state/listParamsActions.ts)
- **Encoding rules:** [`src/contracts/list-params.ts`](../src/contracts/list-params.ts)
- **Query layer:** [`src/lib/query/`](../src/lib/query/) (`queryClient.ts`, `keys.ts`, `useOrdersList.ts`, `useOrdersTableData.ts`, `mutations.ts`)
- **Proof:** [`src/lib/query/__tests__/noDoubleFetch.test.tsx`](../src/lib/query/__tests__/noDoubleFetch.test.tsx)
- **Demos:** Storybook → **Data/URL state** ([`src/dev/url-state-demo/`](../src/dev/url-state-demo/)) and **Data/URL ↔ Query** ([`src/dev/url-query-demo/`](../src/dev/url-query-demo/)), which adds a live request log

This is README hard problem #1 (shareable, back-button-correct list state, with no loops and no double fetches). The first half is the URL store; [the query half](#the-query-half) connects it to TanStack Query, and [Proof](#proof) lists the request-counting tests that back the claims.

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

## The query half

```
URL ──useListParams──► params (stable per key) ──► key = listParamsKey(params)
                                                     │
                       useOrdersList(params) ◄───────┘
                         queryKey: ['orders', 'list', key]
                         queryFn:  ({ signal }) => fetchOrders(params, signal)
                         placeholderData: keepPreviousData
                                │
                       useDataState → DataBoundary (useOrdersTableData glues the three)
```

### Key design

`queryKeys` ([`keys.ts`](../src/lib/query/keys.ts)) builds every key:

```
['orders']                         orders.all
['orders', 'list']                 orders.lists()        ← invalidate every list
['orders', 'list', 'page=2&f=…']   orders.list(key)      ← one page of one view
['metrics']                        metrics.all
['metrics', 'kpis', '30d']         metrics.kpis(range)
```

- **The list key is the canonical string**, not the params object. Equivalent params ⇔ equal keys, so a reordered link, a default written out, or a change in another namespace can't create a second cache entry, or a second request. It's also exactly the query string `fetchOrders` sends, so a cache entry and a request URL are one-to-one.
- **The hierarchy enables targeted invalidation.** A mutation invalidates `orders.lists()` (every page and filter) and `metrics.all`, and nothing else.

### keepPreviousData → isPlaceholder

When the key changes (next page, new filter), the new query has no data yet. With `placeholderData: keepPreviousData` the previous key's rows stay on screen, and `isPlaceholderData` is true. `toDataState` turns that into `ready` with `isPlaceholder: true`, so `DataBoundary` dims the old rows and shows the refetch bar instead of flashing a skeleton. When the new page lands, `isPlaceholder` goes false. (An empty placeholder is treated as `loading`, so "no results" never flashes for the wrong key; see [data-states.md](data-states.md).)

### Cancellation, and why the client rethrows AbortError

Every `queryFn` passes TanStack's `signal` to the API client. When the key changes before the response arrives, the old query loses its last observer, and because its signal was used, TanStack aborts it. Click three filters quickly and two requests are cancelled, not just ignored.

`apiFetch` rethrows the `AbortError` unchanged instead of wrapping it in an `ApiError`. TanStack recognizes its own cancellation by that error and reverts the query quietly. Wrapped, it would look like a real failure: an error state (or a retry) for a request nobody is waiting on any more.

### The prefetch effect

`useOrdersList` prefetches page + 1 after the current page's real data arrives (not while showing a placeholder, and not past the last page). It's the only effect in the query layer, and it's safe:

- **Idempotent:** `prefetchQuery` joins an in-flight fetch for that key, and does nothing while the page is cached and fresh. Running it twice (StrictMode) or on every refetch costs nothing.
- **No feedback:** it writes to neither the URL nor the current query, so it can't trigger itself.

"Next page" is then served from cache: ready immediately, with no placeholder and no request.

### Retry policy

`shouldRetry(failureCount, error)` ([`queryClient.ts`](../src/lib/query/queryClient.ts)), used by the app client. Stories and tests don't retry by default, so error states show at once; a story opts in with `parameters.query = { retry: true }`.

| Error                            | Retries                 | Why                                                   |
| -------------------------------- | ----------------------- | ----------------------------------------------------- |
| 400, 404, 422                    | never                   | The request is wrong; sending it again can't succeed. |
| `CONTRACT` (2xx body ≠ contract) | never                   | The server will give the same answer again.           |
| status 0 (no response), 5xx      | up to 2 (500ms, 1000ms) | Transient: the network or the server may recover.     |
| other 4xx, non-`ApiError`        | never                   | Not known to be transient.                            |
| `AbortError`                     | n/a                     | Cancellation, not a failure (see above).              |

### staleTime: 30 seconds

Within 30s, Back/Forward and revisiting a view are served from cache with **no request**. After that, the cached data still shows at once and is revalidated in the background (stale-while-revalidate), including on window focus, which shows the RefetchIndicator. Thirty seconds is short enough that a dashboard doesn't show old numbers for long, and long enough to cover the clicking around within a session. Unused entries (old filters, prefetched pages) are kept for 5 minutes (`gcTime`), so Back stays instant.

### No optimistic updates

They were deliberately cut. Mutations wait for the server, then invalidate `orders.lists()` and `metrics.all`; the active queries refetch with the truth, and the rest refetch when next used. A bulk status update can partly succeed (`{ updated, failed }`), so an optimistic version would need a per-row rollback matching the server's `failed` list, across every cached page and filter it touched. That's a lot of complexity for a ~300ms win.

## Proof

[`noDoubleFetch.test.tsx`](../src/lib/query/__tests__/noDoubleFetch.test.tsx) renders the real hooks (memory URL + `createQueryClient({ mode: 'test' })`), all inside `<StrictMode>`, which double-invokes effects. MSW's `request:start` event counts what actually reached the network, and a fetch spy records which signals were aborted. Each test name is a claim:

| Claim (test name)                                                            | Measured                                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| initial mount makes exactly 1 list request (+1 prefetch for page 2)          | page 1: 1, page 2: 1, total 2, aborted 0                                       |
| changing a filter on page 3 makes exactly 1 request, already for page 1      | new filter page 1: 1, page 3: 0 (+1 page-2 prefetch), total 2                  |
| an equivalent but differently-ordered URL makes 0 requests                   | 0 (canonicalized to the same key, cache hit)                                   |
| Back to the previous view makes 0 requests within staleTime                  | 0, and the data is the identical cached object                                 |
| changing an unrelated param (?network or another namespace) makes 0 requests | 0, same `params` object and `key`                                              |
| rapid filter changes cancel stale requests and the last one wins             | 3 requests (earlier ones slower), 2 aborted, data matches the last params      |
| the next page is served from the prefetch cache                              | page 2: 0 new (ready, not placeholder, in the same render); +1 page-3 prefetch |
| while the next page loads, the previous rows stay visible                    | ready + isPlaceholder (page-1 rows), then ready with page 2; 1 request         |
| bulk update invalidates lists and metrics                                    | 1 PATCH, then list 1 and KPIs 1: total 3                                       |

The retry policy has its own tests ([`queryClient.test.ts`](../src/lib/query/__tests__/queryClient.test.ts)): the app client sends a 503 three times (two retries) and a 422 once.

Storybook's **Data/URL ↔ Query** shows the same thing live: its play test checks that a filter change adds exactly one list request (plus its prefetch), and Back adds none.
