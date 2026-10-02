import { useLayoutEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useDelayedFlag, type DataState, type ReadyMeta } from '@/lib/data-state'
import { useAnnounce } from '../announcer'
import { NoDataEmptyState, NoResultsEmptyState, type EmptyStateSize } from './EmptyState'
import { ErrorState } from './ErrorState'
import { RefetchIndicator } from './RefetchIndicator'
import { StaleBanner } from './StaleBanner'

export interface DataBoundaryProps<T> {
  state: DataState<T>
  /** Mirrors the final layout, so nothing shifts when the data arrives. */
  skeleton: ReactNode
  /** Default: a generic NoDataEmptyState ("No {label} yet"). */
  empty?: ReactNode
  /** Default: NoResultsEmptyState wired to state.clear. */
  noResults?: ReactNode
  /** Passed to the default empty and error UIs. 'compact' for KPI cards. */
  size?: EmptyStateSize
  /** Accessible name of the region, e.g. "Orders". Also used in announcements. */
  label: string
  className?: string
  children: (data: T, meta: ReadyMeta) => ReactNode
}

/**
 * Renders a DataState: skeleton, empty, no-results, error, or the data (with a
 * refetch bar, a stale banner and placeholder dimming). Owns the region's
 * aria-busy, its announcements, and focus after a retry.
 */
export function DataBoundary<T>({
  state,
  skeleton,
  empty,
  noResults,
  size = 'default',
  label,
  className,
  children,
}: DataBoundaryProps<T>) {
  const sectionRef = useRef<HTMLElement>(null)
  const focusInside = useRef(false)
  const announce = useAnnounce()

  /*
   * Retrying. In TanStack Query v5, refetching a query that has an error and
   * no data resets it to pending, so Retry gives error → loading → ready, not
   * error → ready. Showing the skeleton there would unmount the focused Retry
   * button mid-click. Instead, the last error stays on screen with a busy
   * Retry until the reload settles. (Derived state, updated during render.)
   */
  const [lastError, setLastError] = useState<Extract<DataState<T>, { status: 'error' }> | null>(
    null,
  )
  if (state.status === 'error' && lastError !== state) setLastError(state)
  if (state.status !== 'error' && state.status !== 'loading' && lastError !== null) {
    setLastError(null)
  }
  const retrying = state.status === 'loading' && lastError !== null
  /** What's on screen: the retrying state displays as an error. */
  const shown: DataState<T>['status'] = retrying ? 'error' : state.status
  const loading = state.status === 'loading'
  const showSkeleton = useDelayedFlag(loading && !retrying)
  const refetching = state.status === 'ready' && state.isRefetching
  const stale = state.status === 'ready' && state.staleError !== undefined
  // Seeded with the first render, so mounting is never itself a "transition".
  const previous = useRef({ shown, retrying, stale })

  // Announce transitions only, never every load (that would be too chatty).
  useLayoutEffect(() => {
    const before = previous.current
    previous.current = { shown, retrying, stale }

    // Entering error, including a retry that failed again: the user pressed
    // Retry and needs to hear the outcome.
    if (state.status === 'error' && (before.shown !== 'error' || before.retrying)) {
      announce(`${label} failed to load`)
    }

    if (shown === 'ready' && before.shown === 'error') {
      announce(`${label} loaded`)
      // The Retry button that had focus just unmounted, so focus fell to
      // <body>: a keyboard user would have to Tab from the top of the page.
      // Put focus on the region instead, right where they were.
      const active = document.activeElement
      if (focusInside.current && (active === null || active === document.body)) {
        sectionRef.current?.focus()
      }
    }

    if (stale && !before.stale) {
      announce(`${label} couldn't refresh`)
    }
  }, [state.status, shown, retrying, stale, label, announce])

  // Track whether focus is inside, including when the focused element is
  // removed from the DOM (browsers differ on whether that fires focusout).
  const handleFocus = () => {
    focusInside.current = true
  }
  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    if (next) {
      focusInside.current = false
      return
    }
    // No new target: either the user blurred to nothing (the element is still
    // connected) or the element was removed (it isn't). Only the first means
    // focus really left.
    const target = event.target
    queueMicrotask(() => {
      if (target.isConnected) focusInside.current = false
    })
  }

  let content: ReactNode
  // Once the skeleton is visible it stays for useDelayedFlag's minimum (300ms),
  // whatever the state became, so a response at 160ms doesn't flash it for 10ms.
  const holdSkeleton = showSkeleton && !retrying
  if (holdSkeleton) content = skeleton
  else
    switch (state.status) {
      case 'loading':
        if (retrying) {
          // Same element type and position as the error branch, so React keeps
          // the ErrorState (and the focused Retry button) mounted.
          content = (
            <ErrorState error={lastError.error} onRetry={lastError.retry} size={size} retrying />
          )
          break
        }
        // Before the delay: the skeleton is laid out but invisible, so the space
        // is reserved and nothing jumps when it (or the data) appears.
        content = showSkeleton ? (
          skeleton
        ) : (
          <div aria-hidden="true" className="invisible">
            {skeleton}
          </div>
        )
        break
      case 'empty':
        content = empty ?? <NoDataEmptyState noun={label.toLowerCase()} size={size} />
        break
      case 'no-results':
        content = noResults ?? (
          <NoResultsEmptyState noun={label.toLowerCase()} onClear={state.clear} size={size} />
        )
        break
      case 'error':
        content = <ErrorState error={state.error} onRetry={state.retry} size={size} />
        break
      case 'ready': {
        const { data, isRefetching, isPlaceholder, staleError, updatedAt, retry } = state
        content = (
          <div className="flex flex-col gap-3">
            {staleError ? <StaleBanner updatedAt={updatedAt} onRetry={retry} /> : null}
            {/*
            Placeholder data (the previous key's results) is drained of colour
            rather than faded: even 90% opacity drops muted text below 4.5:1,
            while grayscale keeps luminance (and so contrast) roughly intact.
          */}
            <div
              data-placeholder={isPlaceholder ? '' : undefined}
              className="transition-[filter] duration-(--duration-base) ease-standard data-placeholder:cursor-progress data-placeholder:grayscale"
            >
              {children(data, { isRefetching, isPlaceholder, staleError, updatedAt })}
            </div>
          </div>
        )
        break
      }
    }

  return (
    <section
      ref={sectionRef}
      aria-label={label}
      aria-busy={loading || holdSkeleton || refetching}
      data-state={state.status}
      tabIndex={-1}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn('relative rounded-md focus-ring', className)}
    >
      <RefetchIndicator active={refetching} />
      {content}
    </section>
  )
}
