import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { IconButton } from '@/components'
import { isMemoryAdapter, useUrlAdapter, type UrlAdapter } from '@/lib/url-state'

/** Search + history position as one primitive, so Back/Forward between equal URLs still re-render. */
function snapshotOf(adapter: UrlAdapter): string {
  if (!isMemoryAdapter(adapter)) return adapter.getSearch()
  return `${adapter.index}|${adapter.entries.length}|${adapter.getSearch()}`
}

/**
 * Dev-only: a fake address bar for the in-memory URL Storybook gives each
 * story, so you can watch the URL change inside the iframe. Back/Forward and
 * the entry count only work with a memory adapter.
 */
export function UrlBar() {
  const adapter = useUrlAdapter()
  useSyncExternalStore(adapter.subscribe, () => snapshotOf(adapter))
  const search = adapter.getSearch()
  const memory = isMemoryAdapter(adapter) ? adapter : undefined

  return (
    <div className="flex items-start gap-2 rounded-lg bg-surface p-2">
      {memory && (
        <div className="flex shrink-0 gap-1">
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Back"
            disabled={memory.index === 0}
            onClick={() => memory.back()}
          >
            <ArrowLeft />
          </IconButton>
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Forward"
            disabled={memory.index >= memory.entries.length - 1}
            onClick={() => memory.forward()}
          >
            <ArrowRight />
          </IconButton>
        </div>
      )}
      <output
        aria-label="Current URL"
        className="min-w-0 flex-1 self-center rounded-md bg-surface-subtle px-3 py-1.5 font-mono text-xs break-all text-fg"
      >
        /{search}
      </output>
      {memory && (
        <span
          data-testid="history-count"
          className="shrink-0 self-center px-1 text-xs whitespace-nowrap text-fg-muted"
        >
          {memory.index + 1} / {memory.entries.length} entries
        </span>
      )}
    </div>
  )
}
