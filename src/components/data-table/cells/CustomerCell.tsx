import { Copy } from 'lucide-react'
import { memo, use } from 'react'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { cn } from '@/lib/cn'
import { setQuery } from '@/lib/url-state'
import { useAnnounce } from '../../announcer'
import { Avatar } from '../../avatar'
import { IconButton } from '../../icon-button'
import { TruncatedText } from '../../tooltip'
import { DataTableParamsContext } from '../context'
import { useCellInteractive } from '../keyboard/focusTarget'

/**
 * Avatar + name + email, with two actions: the name filters the table to that
 * customer, and a copy button copies the email. The avatar is decorative: the
 * name is right next to it.
 *
 * A COMPOSITE cell (meta.cellKind: 'composite'): two controls in one cell. By
 * keyboard the cell is focused first; Enter (or F2) moves focus to the name,
 * Tab to the copy button and back, Escape returns to the cell. Each control
 * spreads useCellInteractive(), which hands it the right tabIndex. Outside a
 * DataTable the name is plain text and only the copy button remains.
 *
 * Memoized: its props are two strings, so a row re-render (selection, the
 * active row) doesn't re-render its controls and tooltips.
 */
export const CustomerCell = memo(function CustomerCell({
  name,
  email,
}: {
  name: string
  email: string
}) {
  const setParams = use(DataTableParamsContext)
  const control = useCellInteractive()
  const announce = useAnnounce()
  const copy = useCopyToClipboard()

  const filterByName = () => {
    if (!setParams) return
    // A push, so Back returns to the unfiltered list.
    setParams(setQuery(name))
    announce(`Filtered by ${name}`)
  }

  return (
    <span className="flex w-full min-w-0 items-center gap-3">
      <Avatar name={name} size="sm" decorative />
      <span className="flex min-w-0 flex-col items-start">
        {setParams ? (
          <button
            type="button"
            {...control}
            // The visible text is the name; the name says what pressing it does
            // (and still contains the visible label, WCAG 2.5.3).
            aria-label={`Filter by ${name}`}
            onClick={filterByName}
            className={cn(
              'relative max-w-full min-w-0 rounded-xs text-left text-fg focus-ring',
              'underline-offset-2 hover-enabled:underline',
              // A 24px hit area around a 20px line of text, without changing the layout.
              "before:absolute before:-inset-x-0.5 before:-inset-y-0.5 before:content-['']",
            )}
          >
            <TruncatedText>{name}</TruncatedText>
          </button>
        ) : (
          <TruncatedText className="text-fg">{name}</TruncatedText>
        )}
        <TruncatedText className="text-xs text-fg-muted">{email}</TruncatedText>
      </span>
      <IconButton
        {...control}
        variant="ghost"
        size="sm"
        aria-label={`Copy email for ${name}`}
        onClick={() => void copy(email, 'Email copied')}
        className={cn(
          'ml-auto shrink-0',
          // Shown on row hover or focus (always while interacting: focus is in
          // the row then), and always on touch screens, which have no hover.
          'opacity-0 transition-opacity duration-(--duration-fast)',
          'group-focus-within/row:opacity-100 group-hover/row:opacity-100 pointer-coarse:opacity-100',
          !setParams && 'opacity-100',
        )}
      >
        <Copy />
      </IconButton>
    </span>
  )
})
