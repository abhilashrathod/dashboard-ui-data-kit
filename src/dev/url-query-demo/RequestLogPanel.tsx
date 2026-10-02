import { useSyncExternalStore } from 'react'
import { Badge, Button, Card } from '@/components'
import { cn } from '@/lib/cn'
import type { BrowserRequestLog, RequestRow } from './browserRequestLog'

const MAX_QUERY_CHARS = 64

function abbreviate(search: string): string {
  let readable = search
  try {
    readable = decodeURIComponent(search)
  } catch {
    // Leave malformed escapes as they are.
  }
  return readable.length > MAX_QUERY_CHARS ? `${readable.slice(0, MAX_QUERY_CHARS - 1)}…` : readable
}

const seconds = (ms: number) => `+${(ms / 1000).toFixed(2)}s`

function statusTone(row: RequestRow) {
  if (row.status === undefined) return 'text-fg-muted'
  return row.status < 400 ? 'text-status-success-fg' : 'text-status-danger-fg'
}

/**
 * Dev-only: every request the page made, newest first, with tags for the
 * ones the claims are about (aborted, prefetch, retry).
 */
export function RequestLogPanel({ log }: { log: BrowserRequestLog }) {
  const rows = useSyncExternalStore(log.subscribe, log.getSnapshot)

  return (
    <Card role="region" aria-label="Request log" className="flex flex-col gap-3">
      <Card.Header
        actions={
          <Button variant="ghost" size="sm" onClick={log.clear}>
            Clear
          </Button>
        }
      >
        <Card.Title className="text-sm font-medium">
          Requests{' '}
          <span data-testid="request-total" className="text-fg-muted tabular-nums">
            ({rows.length})
          </span>
        </Card.Title>
      </Card.Header>
      {rows.length === 0 ? (
        <p className="text-sm text-fg-muted">No requests yet.</p>
      ) : (
        <ol className="flex max-h-96 flex-col gap-1 overflow-y-auto font-mono text-xs">
          {[...rows].reverse().map((row) => (
            <li
              key={row.id}
              data-testid="request-row"
              data-path={row.pathname}
              data-search={row.search}
              data-tags={[
                row.aborted && 'aborted',
                row.prefetch && 'prefetch',
                row.retry && 'retry',
              ]
                .filter(Boolean)
                .join(' ')}
              className={cn(
                'flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-surface-subtle px-2 py-1.5',
                row.aborted && 'opacity-60',
              )}
            >
              <span className="text-fg-muted tabular-nums">{seconds(row.startedAt)}</span>
              <span className="min-w-0 flex-1 break-all text-fg" title={row.pathname + row.search}>
                {row.method !== 'GET' && `${row.method} `}
                {row.pathname}
                {abbreviate(row.search)}
              </span>
              <span className={cn('tabular-nums', statusTone(row))}>{row.status ?? '…'}</span>
              <span className="w-14 text-right text-fg-muted tabular-nums">
                {row.durationMs === undefined ? '' : `${Math.round(row.durationMs)}ms`}
              </span>
              {row.aborted && <Badge tone="danger">aborted</Badge>}
              {row.prefetch && <Badge tone="info">prefetch</Badge>}
              {row.retry && <Badge tone="warning">retry</Badge>}
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
