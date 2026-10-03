import { useEffect, useState, type RefObject } from 'react'

interface Trace {
  row: string
  col: string
  ariaRowIndex: string
  lastKey: string
  focusInGrid: boolean
}

const EMPTY: Trace = { row: '–', col: '–', ariaRowIndex: '–', lastKey: '–', focusInGrid: false }

/** "Ctrl+Shift+End", "Space", "Cmd+A". */
function keyLabel(event: KeyboardEvent): string {
  const parts: string[] = []
  if (event.ctrlKey) parts.push('Ctrl')
  if (event.metaKey) parts.push('Cmd')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey && event.key !== 'Shift') parts.push('Shift')
  const key =
    event.key === ' ' ? 'Space' : event.key.length === 1 ? event.key.toUpperCase() : event.key
  if (!['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) parts.push(key)
  return parts.join('+')
}

/**
 * Dev-only: a live readout of the grid's keyboard state, for demos and the
 * Loom. It only OBSERVES the DOM (the one element with tabIndex 0 is the
 * active cell's focus target), so it needs no hooks into the table.
 */
export function FocusTrace({ scope }: { scope: RefObject<HTMLElement | null> }) {
  const [trace, setTrace] = useState<Trace>(EMPTY)

  useEffect(() => {
    const root = scope.current
    if (!root) return
    let lastKey = '–'

    const read = () => {
      const grid = root.querySelector<HTMLElement>('[role="grid"]')
      const target = grid?.querySelector<HTMLElement>('[tabindex="0"]')
      const cell = target?.closest<HTMLElement>('[data-grid-row]')
      setTrace({
        row: cell?.dataset.gridRow ?? '–',
        col: cell?.dataset.gridCol ?? '–',
        ariaRowIndex: target?.closest('[role="row"]')?.getAttribute('aria-rowindex') ?? '–',
        lastKey,
        focusInGrid: grid?.contains(document.activeElement) ?? false,
      })
    }
    const onKeyDown = (event: KeyboardEvent) => {
      lastKey = keyLabel(event)
      requestAnimationFrame(read)
    }

    const observer = new MutationObserver(read)
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['tabindex', 'aria-rowindex'],
    })
    root.addEventListener('keydown', onKeyDown, true)
    root.addEventListener('focusin', read)
    root.addEventListener('focusout', read)
    read()
    return () => {
      observer.disconnect()
      root.removeEventListener('keydown', onKeyDown, true)
      root.removeEventListener('focusin', read)
      root.removeEventListener('focusout', read)
    }
  }, [scope])

  const rowLabel = trace.row === '-1' ? '-1 (header)' : trace.row
  const items: [string, string][] = [
    ['active', `{ row: ${rowLabel}, col: ${trace.col} }`],
    ['aria-rowindex', trace.ariaRowIndex],
    ['last key', trace.lastKey],
    ['focus in grid', trace.focusInGrid ? 'yes' : 'no'],
  ]

  return (
    <dl
      data-testid="focus-trace"
      className="flex flex-wrap gap-x-6 gap-y-1 rounded-md border border-dashed border-border px-3 py-2 font-mono text-xs"
    >
      {items.map(([term, value]) => (
        <div key={term} className="flex gap-2">
          <dt className="text-fg-muted">{term}</dt>
          <dd className="text-fg tabular">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
