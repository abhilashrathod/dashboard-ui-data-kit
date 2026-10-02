import { createContext, use } from 'react'
import type { BulkStatusUpdateResult, OrderStatus } from '@/contracts'

export interface BulkFailureDetails {
  status: OrderStatus
  failed: BulkStatusUpdateResult['failed']
}

export const BulkDetailsContext = createContext<((details: BulkFailureDetails) => void) | null>(
  null,
)

/** Opens the "couldn't be changed" dialog. Needs <BulkDetailsProvider> above. */
export function useShowBulkDetails(): (details: BulkFailureDetails) => void {
  const show = use(BulkDetailsContext)
  if (!show) throw new Error('BulkStatusAction must be used inside <BulkDetailsProvider>.')
  return show
}
