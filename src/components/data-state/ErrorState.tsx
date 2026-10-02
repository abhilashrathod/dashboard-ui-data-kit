import { CloudOff, Copy, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import type { ApiError, ApiErrorCode } from '@/lib/api'
import { Button } from '../button'
import { IconButton } from '../icon-button'
import { useToast } from '../toast'
import { EmptyState, type EmptyStateSize } from './EmptyState'

/** User-facing copy for every ApiError code. The one place to change it. */
export const ERROR_COPY: Record<ApiErrorCode, { title: string; description: string }> = {
  UNAVAILABLE: {
    title: "Can't reach the server",
    description: 'Check your connection, then try again.',
  },
  SERVER_ERROR: {
    title: 'Something went wrong on our side',
    description: "It's not you. Try again in a moment.",
  },
  CONTRACT: {
    title: "We received data we didn't expect",
    description: 'Try again. If it keeps happening, report it with the request ID.',
  },
  BAD_REQUEST: {
    title: 'This view has an invalid filter',
    description: 'Reset the filters and try again.',
  },
  VALIDATION: {
    title: "Some values aren't valid",
    description: 'Check the values you entered and try again.',
  },
  NOT_FOUND: {
    title: 'Not found',
    description: 'It may have been deleted or moved.',
  },
}

export interface ErrorStateProps {
  error: ApiError
  /** May return a promise (e.g. refetch); the button shows loading until it settles. */
  onRetry: () => unknown
  size?: EmptyStateSize
  /** Overrides the title from ERROR_COPY. */
  title?: string
  /** A retry is running elsewhere (DataBoundary sets this while the query reloads). */
  retrying?: boolean
}

/**
 * A failed load: what happened, a Retry, and the request ID for support.
 *
 * Deliberately NOT role="alert": a dashboard can have several widgets fail at
 * once, and each alert would interrupt the screen reader. DataBoundary
 * announces "{label} failed to load" politely instead.
 */
export function ErrorState({
  error,
  onRetry,
  size = 'default',
  title,
  retrying: retryingOutside = false,
}: ErrorStateProps) {
  const [retrying, setRetrying] = useState(false)
  const { toast } = useToast()
  const copy = ERROR_COPY[error.code]
  const compact = size === 'compact'

  const retry = () => {
    setRetrying(true)
    void Promise.resolve()
      .then(onRetry)
      .finally(() => setRetrying(false))
  }

  const copyRequestId = async (requestId: string) => {
    try {
      await navigator.clipboard.writeText(requestId)
      toast({ title: 'Copied', description: `Request ID ${requestId}` })
    } catch {
      toast({ title: "Couldn't copy the request ID", tone: 'danger' })
    }
  }

  return (
    <EmptyState
      tone="danger"
      size={size}
      icon={error.code === 'UNAVAILABLE' ? <CloudOff /> : <TriangleAlert />}
      title={title ?? copy.title}
      description={compact ? undefined : copy.description}
      data-error-code={error.code}
      action={
        <>
          <Button
            variant="secondary"
            size="sm"
            loading={retrying || retryingOutside}
            onClick={retry}
          >
            Retry
          </Button>
          {error.requestId ? (
            <p className="flex items-center gap-1 text-xs text-fg-muted">
              <span>
                Request ID: <span className="font-mono">{error.requestId}</span>
              </span>
              <IconButton
                variant="ghost"
                size="sm"
                className="size-6 [&_svg]:size-3.5"
                aria-label="Copy request ID"
                onClick={() => void copyRequestId(error.requestId!)}
              >
                <Copy />
              </IconButton>
            </p>
          ) : null}
        </>
      }
    />
  )
}
