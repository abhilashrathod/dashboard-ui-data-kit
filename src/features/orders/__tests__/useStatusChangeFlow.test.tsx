import { act, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KitProvider } from '@/components'
import type { BulkStatusUpdateResult } from '@/contracts'
import { makeOrder } from '@/mocks/query/__tests__/makeOrder'
import { BulkDetailsProvider } from '../BulkDetailsProvider'
import { useStatusChangeFlow } from '../useStatusChangeFlow'

const mutateAsync = vi.hoisted(() => vi.fn())
vi.mock('@/lib/query', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useBulkUpdateStatus: () => ({ mutateAsync }),
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <KitProvider>
    <BulkDetailsProvider>{children}</BulkDetailsProvider>
  </KitProvider>
)

const updatedOnly = (...ids: string[]): BulkStatusUpdateResult => ({
  updated: ids.map((id) => makeOrder({ id })),
  failed: [],
})

beforeEach(() => mutateAsync.mockReset())

describe('useStatusChangeFlow', () => {
  it('bulk: plural wording, the selection ids in one request', async () => {
    mutateAsync.mockResolvedValue(updatedOnly('ORD-000001', 'ORD-000002', 'ORD-000003'))
    const onResult = vi.fn()
    const { result } = renderHook(() => useStatusChangeFlow({ onResult }), { wrapper })

    act(() =>
      result.current.start({ ids: ['ORD-000001', 'ORD-000002', 'ORD-000003'], status: 'shipped' }),
    )
    expect(result.current.dialogProps).toMatchObject({
      open: true,
      title: 'Mark 3 orders as shipped?',
      tone: 'default',
      confirmLabel: 'Mark as shipped',
    })
    expect(result.current.dialogProps.description).toContain('They stay selected')

    await act(() => result.current.dialogProps.onConfirm())
    expect(mutateAsync).toHaveBeenCalledWith({
      ids: ['ORD-000001', 'ORD-000002', 'ORD-000003'],
      status: 'shipped',
    })
    expect(await screen.findByText('3 orders marked as shipped')).toBeInTheDocument()
    expect(onResult).toHaveBeenCalledWith(
      expect.objectContaining({ failed: [] }),
      expect.objectContaining({ status: 'shipped' }),
    )
  })

  it('single: singular wording, the same request shape (a one-id bulk)', async () => {
    mutateAsync.mockResolvedValue(updatedOnly('ORD-000007'))
    const { result } = renderHook(() => useStatusChangeFlow(), { wrapper })

    act(() => result.current.start({ ids: ['ORD-000007'], status: 'refunded', single: true }))
    expect(result.current.dialogProps).toMatchObject({
      title: 'Mark order ORD-000007 as refunded?',
      description:
        "If the order can't move to refunded from its current status, it stays as it is.",
      tone: 'danger',
    })

    await act(() => result.current.dialogProps.onConfirm())
    expect(mutateAsync).toHaveBeenCalledWith({ ids: ['ORD-000007'], status: 'refunded' })
    expect(await screen.findByText('Order ORD-000007 marked as refunded')).toBeInTheDocument()
  })

  it('single, rejected by the server: the reason in the toast, no details dialog', async () => {
    mutateAsync.mockResolvedValue({
      updated: [],
      failed: [{ id: 'ORD-000007', reason: "Can't move refunded → shipped" }],
    })
    const { result } = renderHook(() => useStatusChangeFlow(), { wrapper })
    act(() => result.current.start({ ids: ['ORD-000007'], status: 'shipped', single: true }))
    await act(() => result.current.dialogProps.onConfirm())

    expect(await screen.findByText("Order ORD-000007 couldn't be changed")).toBeInTheDocument()
    expect(screen.getAllByText("Can't move refunded → shipped").length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'View details' })).toBeNull()
  })
})
