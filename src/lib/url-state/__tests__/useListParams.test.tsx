import { act, renderHook } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_LIST_PARAMS, type Filter } from '@/contracts'
import { createMemoryAdapter, type MemoryUrlAdapter } from '../adapter'
import { setPage, setSort, upsertFilter } from '../listParamsActions'
import { useListParams } from '../useListParams'
import { UrlStateProvider } from '../UrlStateProvider'

function setup(initialSearch = '', namespace = 'orders') {
  const adapter = createMemoryAdapter(initialSearch)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StrictMode>
      <UrlStateProvider adapter={adapter}>{children}</UrlStateProvider>
    </StrictMode>
  )
  const hook = renderHook(() => useListParams(namespace), { wrapper })
  return { adapter, ...hook }
}

const paid: Filter = { field: 'status', op: 'in', value: ['paid'] }

describe('useListParams', () => {
  it('reads defaults from an empty URL', () => {
    const { result, adapter } = setup()
    expect(result.current.params).toEqual(DEFAULT_LIST_PARAMS)
    expect(result.current.key).toBe('')
    expect(result.current.dropped).toEqual([])
    expect(adapter.navigateCount).toBe(0)
  })

  it('reads its namespace from the URL', () => {
    const { result } = setup('?orders.page=3&orders.sort=-amount&orders.f=status:in:paid')
    expect(result.current.params).toMatchObject({ page: 3, sort: '-amount', filters: [paid] })
  })

  it('setParams pushes by default; history "replace" replaces', () => {
    const { result, adapter } = setup()

    act(() => result.current.setParams(setSort('amount')))
    expect(adapter.entries).toEqual(['', '?orders.sort=-amount'])

    act(() => result.current.setParams(setSort('amount'), { history: 'replace' }))
    expect(adapter.entries).toEqual(['', '?orders.sort=amount'])
    expect(result.current.params.sort).toBe('amount')
  })

  it('accepts a params object as well as an updater', () => {
    const { result, adapter } = setup()
    act(() => result.current.setParams({ ...DEFAULT_LIST_PARAMS, pageSize: 100 }))
    expect(adapter.getSearch()).toBe('?orders.size=100')
  })

  it('resets the page when a filter changes, in one history entry', () => {
    const { result, adapter } = setup('?orders.page=3')
    act(() => result.current.setParams(upsertFilter(paid)))
    expect(adapter.entries).toEqual(['?orders.page=3', '?orders.f=status:in:paid'])
  })

  it('composes two rapid setParams calls in the same tick', () => {
    const { result, adapter } = setup()
    act(() => {
      // Both calls use the same render's setParams; the second must see the first's write.
      result.current.setParams(setSort('amount'))
      result.current.setParams(upsertFilter(paid))
    })
    expect(adapter.getSearch()).toBe('?orders.sort=-amount&orders.f=status:in:paid')
    expect(result.current.params).toMatchObject({ sort: '-amount', filters: [paid] })
  })

  it('keeps two instances on the same namespace in sync', () => {
    const adapter = createMemoryAdapter()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UrlStateProvider adapter={adapter}>{children}</UrlStateProvider>
    )
    const { result } = renderHook(() => [useListParams('orders'), useListParams('orders')], {
      wrapper,
    })

    act(() => result.current[0]!.setParams(setPage(4)))

    expect(result.current[1]!.params.page).toBe(4)
    expect(result.current[1]!.params).toEqual(result.current[0]!.params)
    expect(result.current[1]!.key).toBe(result.current[0]!.key)
  })

  it('keeps params identity and key when another namespace or foreign key changes', () => {
    const { result, adapter } = setup('?orders.page=2&network=slow')
    const before = result.current

    act(() => adapter.navigate('?orders.page=2&network=slow&refunds.sort=amount', 'push'))
    act(() => adapter.navigate('?orders.page=2&network=fast&refunds.sort=amount', 'push'))

    expect(result.current.params).toBe(before.params)
    expect(result.current.key).toBe(before.key)
  })

  it('canonicalizes a messy link once, with replace', () => {
    const messy =
      '?orders.f=status:in:shipped,paid&network=slow&orders.page=1&orders.size=50&orders.f=channel:in:web&orders.f=amount:gt:abc'
    const { result, adapter, rerender } = setup(messy)

    expect(adapter.navigateCount).toBe(1)
    expect(adapter.entries).toEqual([
      '?orders.f=channel:in:web&orders.f=status:in:paid,shipped&network=slow',
    ])
    expect(result.current.dropped).toEqual(['f[2] "amount:gt:abc": "abc" is not a number'])

    rerender()
    expect(adapter.navigateCount).toBe(1)
    // The note about what was dropped belongs to that entry only.
    act(() => result.current.setParams(setPage(2)))
    expect(result.current.dropped).toEqual([])
  })

  it('does not navigate for an update that leaves the params equal', () => {
    const { result, adapter } = setup('?orders.page=2')
    act(() => result.current.setParams((prev) => ({ ...prev })))
    act(() => result.current.setParams(setPage(2)))
    expect(adapter.navigateCount).toBe(0)
  })

  it('resetParams clears only its namespace, pushing', () => {
    const { result, adapter } = setup('?orders.page=2&refunds.page=3')
    act(() => result.current.resetParams())
    expect(adapter.entries).toEqual(['?orders.page=2&refunds.page=3', '?refunds.page=3'])
    expect(result.current.params).toEqual(DEFAULT_LIST_PARAMS)
  })

  it('follows Back and Forward', () => {
    const { result, adapter } = setup()
    act(() => result.current.setParams(setPage(2)))
    act(() => result.current.setParams(setPage(3)))
    act(() => adapter.back())
    expect(result.current.params.page).toBe(2)
    act(() => adapter.forward())
    expect(result.current.params.page).toBe(3)
  })

  it('honors per-list defaults for size and sort', () => {
    const adapter: MemoryUrlAdapter = createMemoryAdapter('?refunds.size=25')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UrlStateProvider adapter={adapter}>{children}</UrlStateProvider>
    )
    const { result } = renderHook(
      () => useListParams('refunds', { defaults: { pageSize: 25, sort: 'amount' } }),
      { wrapper },
    )
    // size=25 is the list default, so it is canonicalized away.
    expect(adapter.getSearch()).toBe('')
    expect(result.current.params).toMatchObject({ pageSize: 25, sort: 'amount' })

    act(() => result.current.setParams((prev) => ({ ...prev, pageSize: 50 })))
    expect(adapter.getSearch()).toBe('?refunds.size=50')
  })
})
