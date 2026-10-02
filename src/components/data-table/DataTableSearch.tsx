import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { QUERY_MAX_LENGTH } from '@/contracts'
import { cn } from '@/lib/cn'
import { setQuery } from '@/lib/url-state'
import { SearchInput } from '../input'
import { useDataTableContext } from './context'
import type { ToolbarSlot } from './DataTableToolbar'
import { SEARCH_DEBOUNCE_MS } from './model'

/** How the URL stores q: trimmed, '' for none. Compare drafts in this form. */
const normalize = (q: string | undefined) => (q ?? '').trim()

export interface DataTableSearchProps {
  /** Default "Search {label}", e.g. "Search orders". */
  'aria-label'?: string
  placeholder?: string
  slot?: ToolbarSlot
  className?: string
}

/**
 * Search box for params.q.
 *
 * The draft is UI state, the URL is app state. What's in the box is the text
 * being typed; the list only sees it once it's committed to the URL (300ms
 * after the last keystroke, or on Enter), with history 'replace' so typing
 * doesn't create Back steps (docs/url-state.md).
 *
 * The subtle part is going the other way. When q changes from OUTSIDE (Back,
 * Clear filters, a shared link) the box must follow the URL. But our own
 * commit also changes q, and the URL holds the trimmed text, so naively
 * copying q into the draft would eat a trailing space mid-typing ("acme " →
 * "acme"), or fight the keyboard in a loop. So:
 *  - `synced` is the URL value this box last agreed with.
 *  - When q differs from it, the box adopts q only if q also differs from what
 *    the draft already says (normalized). Our own commit always matches the
 *    draft, so it never resets it; a real outside change always does.
 * This is derived state, updated during render: no effect copies URL → state.
 */
export function DataTableSearch({
  'aria-label': ariaLabel,
  placeholder,
  className,
}: DataTableSearchProps) {
  const { table, label } = useDataTableContext('Search')
  const { params, setParams } = table
  const urlQ = normalize(params.q)

  const [draft, setDraft] = useState(params.q ?? '')
  const [synced, setSynced] = useState(urlQ)
  if (urlQ !== synced) {
    setSynced(urlQ)
    if (urlQ !== normalize(draft)) setDraft(params.q ?? '')
  }

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Each URL change (outside, or our own commit) drops any pending commit, so
  // a debounce scheduled before Back can't overwrite what Back restored.
  // The cleanup also cancels it on unmount.
  useEffect(() => () => clearTimeout(timer.current), [synced])

  const commit = (value: string) => {
    clearTimeout(timer.current)
    setParams(setQuery(value), { history: 'replace' })
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setDraft(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => commit(value), SEARCH_DEBOUNCE_MS)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') commit(event.currentTarget.value)
  }

  return (
    <SearchInput
      value={draft}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      maxLength={QUERY_MAX_LENGTH}
      aria-label={ariaLabel ?? `Search ${label.toLowerCase()}`}
      placeholder={placeholder ?? `Search ${label.toLowerCase()}…`}
      className={cn('w-full sm:w-72', className)}
    />
  )
}
