import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/format'

/** The current time, updated every `intervalMs`, so relative times stay true. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

export interface StaleBannerProps {
  /** When the data on screen was fetched. */
  updatedAt: number
  onRetry: () => unknown
  className?: string
}

/**
 * "Couldn't refresh · showing data from 2 minutes ago": the last refresh
 * failed, but the older data stays on screen (stale-while-error).
 */
export function StaleBanner({ updatedAt, onRetry, className }: StaleBannerProps) {
  const now = useNow(30_000)
  const [retrying, setRetrying] = useState(false)

  const retry = () => {
    setRetrying(true)
    void Promise.resolve()
      .then(onRetry)
      .finally(() => setRetrying(false))
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-status-warning-subtle px-3 py-1.5 text-sm text-status-warning-fg',
        className,
      )}
    >
      <RefreshCw aria-hidden="true" className="size-3.5 shrink-0" />
      <span>
        Couldn&apos;t refresh · showing data from {formatRelative(Math.min(updatedAt, now), now)}
      </span>
      <button
        type="button"
        onClick={retry}
        disabled={retrying}
        aria-busy={retrying || undefined}
        className="ml-auto rounded-xs font-medium underline underline-offset-2 focus-ring disabled:cursor-progress disabled:no-underline"
      >
        {retrying ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  )
}
