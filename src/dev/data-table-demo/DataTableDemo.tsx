import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, RefreshCw, RotateCw } from 'lucide-react'
import { useLayoutEffect, useState } from 'react'
import { Button } from '@/components'
import { OrdersTable } from '@/features/orders/OrdersTable'
import { queryKeys } from '@/lib/query'
import { useListParams } from '@/lib/url-state'
import { worker } from '@/mocks/browser'
import { UrlBar } from '../UrlBar'
import { createBrowserRequestLog } from '../url-query-demo/browserRequestLog'
import { RequestLogPanel } from '../url-query-demo/RequestLogPanel'

export interface DataTableDemoProps {
  /** Constrains the table's container, e.g. 375 for a phone-width story. */
  width?: number
  gridClassName?: string
}

/**
 * Dev-only: Data/DataTable. The real OrdersTable against the MSW API, with a
 * collapsible dev drawer below it: the in-memory URL (with Back/Forward), a
 * live request log, a Refetch button for forcing a background refresh, and
 * Remount table (a stand-in for reloading the page).
 */
export function DataTableDemo({ width, gridClassName = 'max-h-[34rem]' }: DataTableDemoProps) {
  const { key } = useListParams('orders')
  const queryClient = useQueryClient()
  const [log] = useState(() => createBrowserRequestLog(worker))
  // Bumping the key remounts the table, which is what a reload does to it:
  // local state (selection) is gone, stored preferences (columns) are re-read.
  const [mount, setMount] = useState(0)

  // Layout effects run before passive ones, so the log records the first request.
  useLayoutEffect(() => log.start(), [log])
  useLayoutEffect(() => log.setCurrentKey(key), [log, key])

  return (
    <div className="flex max-w-6xl flex-col gap-4">
      <div style={width ? { width } : undefined} className="max-w-full">
        <OrdersTable key={mount} gridClassName={gridClassName} />
      </div>
      <details open className="group">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-2 rounded-pill px-2 py-1 text-sm font-medium focus-ring [&::-webkit-details-marker]:hidden">
          <ChevronDown
            aria-hidden="true"
            className="size-4 transition-transform duration-(--duration-fast) group-not-open:-rotate-90"
          />
          Dev tools
          <span className="font-normal text-fg-muted">URL, requests</span>
        </summary>
        <div className="mt-2 flex flex-col gap-3">
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              <UrlBar />
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw />}
              onClick={() =>
                void queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() })
              }
            >
              Refetch
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCw />}
              onClick={() => setMount((count) => count + 1)}
            >
              Remount table
            </Button>
          </div>
          <RequestLogPanel log={log} />
        </div>
      </details>
    </div>
  )
}
