import { RotateCcw } from 'lucide-react'
import { useLayoutEffect, useState } from 'react'
import {
  Amount,
  Button,
  Card,
  DataBoundary,
  NoDataEmptyState,
  Skeleton,
  StatusPill,
} from '@/components'
import { formatNumber } from '@/lib/format'
import { useOrdersTableData } from '@/lib/query'
import { worker } from '@/mocks/browser'
import { UrlBar } from '../UrlBar'
import { ListParamsControls } from '../url-state-demo/ListParamsControls'
import { createBrowserRequestLog } from './browserRequestLog'
import { RequestLogPanel } from './RequestLogPanel'

const SKELETON_ROWS = 8

const skeleton = (
  <div className="flex flex-col gap-2">
    <Skeleton className="my-0.5 h-3 w-32" />
    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
      <Skeleton key={index} shape="pill" className="h-9 w-full" />
    ))}
  </div>
)

/**
 * Dev-only: Data/URL ↔ Query. The 3a controls drive useOrdersTableData; a
 * minimal results list (not the real table, that's Stage 4) and a live
 * request log show what each click costs on the network.
 */
export function UrlQueryDemo() {
  const { params, setParams, resetParams, dataState, key } = useOrdersTableData('orders')
  const [log] = useState(() => createBrowserRequestLog(worker))

  // Layout effects run before any passive effect, so the log is recording
  // before the queries subscribe and fire their first request.
  useLayoutEffect(() => log.start(), [log])
  useLayoutEffect(() => log.setCurrentKey(key), [log, key])

  return (
    <div className="flex max-w-6xl flex-col gap-4">
      <UrlBar />
      <div className="grid items-start gap-grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="flex flex-col gap-4">
          <Card.Header
            actions={
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RotateCcw />}
                onClick={() => resetParams()}
              >
                Reset
              </Button>
            }
          >
            <Card.Title className="font-mono text-sm">orders.*</Card.Title>
          </Card.Header>
          <ListParamsControls params={params} setParams={setParams} title="orders" />
          <DataBoundary
            state={dataState}
            label="Orders"
            skeleton={skeleton}
            empty={<NoDataEmptyState noun="orders" />}
          >
            {(page) => (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-fg-muted tabular-nums">
                  {formatNumber(page.total)} orders · page {page.page} of{' '}
                  {Math.max(1, Math.ceil(page.total / page.pageSize))}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {page.rows.slice(0, 10).map((order) => (
                    <li
                      key={order.id}
                      className="flex h-9 items-center justify-between gap-3 rounded-pill bg-surface-subtle px-3 text-sm"
                    >
                      <span className="truncate">
                        <span className="font-mono text-xs text-fg-muted">{order.id}</span>{' '}
                        {order.customer.name}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Amount size="sm" value={order.amount} />
                        <StatusPill status={order.status} />
                      </span>
                    </li>
                  ))}
                </ul>
                {page.rows.length > 10 && (
                  <p className="text-xs text-fg-muted">
                    First 10 of {page.rows.length} rows on this page.
                  </p>
                )}
              </div>
            )}
          </DataBoundary>
        </Card>
        <RequestLogPanel log={log} />
      </div>
    </div>
  )
}
