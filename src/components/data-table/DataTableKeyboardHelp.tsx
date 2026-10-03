import { Keyboard } from 'lucide-react'
import { useId, useLayoutEffect, useRef, useState } from 'react'
import { Dialog } from '../dialog'
import { IconButton } from '../icon-button'
import { Tooltip } from '../tooltip'
import { useDataTableContext } from './context'
import type { ToolbarSlot } from './DataTableToolbar'
import { combosFor, comboLabel, KEYMAP, KEYMAP_GROUPS } from './keyboard/keymap'
import { isApplePlatform } from './keyboard/platform'

export interface DataTableKeyboardHelpProps {
  /** Toolbar placement. */
  slot?: ToolbarSlot
  className?: string
}

/**
 * "Keyboard shortcuts": an icon button in the toolbar, and a dialog listing
 * every key the grid understands, grouped, with the platform's modifier
 * (⌘ on a Mac, Ctrl elsewhere). The list is generated from keymap.ts, the
 * same data as the table in docs/keyboard-grid.md.
 *
 * "?" in the grid opens it too (the part registers its opener with the table).
 * Closed from there, focus goes back to the grid's active cell; opened from
 * the button, back to the button.
 */
export function DataTableKeyboardHelp({ className }: DataTableKeyboardHelpProps) {
  const { table, keyboardHelpRef } = useDataTableContext('KeyboardHelp')
  const [open, setOpen] = useState(false)
  const fromGrid = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const isApple = isApplePlatform()
  const headingId = useId()

  useLayoutEffect(() => {
    keyboardHelpRef.current = () => {
      fromGrid.current = true
      setOpen(true)
    }
    return () => {
      keyboardHelpRef.current = null
    }
  }, [keyboardHelpRef])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip content="Keyboard shortcuts (?)">
        <Dialog.Trigger asChild>
          <IconButton
            variant="outline"
            aria-label="Keyboard shortcuts"
            aria-keyshortcuts="?"
            className={className}
            onClick={() => {
              fromGrid.current = false
            }}
          >
            <Keyboard />
          </IconButton>
        </Dialog.Trigger>
      </Tooltip>
      <Dialog.Content
        size="lg"
        ref={panelRef}
        onOpenAutoFocus={(event) => {
          // The panel itself (its title is announced), not the scrollable
          // list, which would get a focus ring around everything.
          event.preventDefault()
          panelRef.current?.focus()
        }}
        onCloseAutoFocus={(event) => {
          if (!fromGrid.current) return // Radix returns focus to the button
          fromGrid.current = false
          event.preventDefault()
          table.returnFocus()
        }}
      >
        <Dialog.Header>
          <Dialog.Title>Keyboard shortcuts</Dialog.Title>
          <Dialog.Description>
            For the table. Press ? in the table to open this list again.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Body
          // It scrolls on short screens and holds nothing focusable: make it
          // keyboard-reachable (axe: scrollable-region-focusable), like Drawer.Body.
          tabIndex={0}
          className="flex flex-col gap-5 rounded-xs focus-ring"
        >
          {KEYMAP_GROUPS.map((group, groupIndex) => (
            <section
              key={group}
              aria-labelledby={`${headingId}-${groupIndex}`}
              className="flex flex-col gap-2"
            >
              <h3 id={`${headingId}-${groupIndex}`} className="text-sm font-semibold">
                {group}
              </h3>
              <dl className="divide-y divide-border text-sm">
                {KEYMAP.filter((entry) => entry.group === group).map((entry) => (
                  <div key={entry.id} className="flex items-baseline gap-4 py-2">
                    <dt className="flex w-44 shrink-0 flex-wrap items-center gap-1">
                      {combosFor(entry, isApple).map((combo, index) => (
                        <span key={index} className="inline-flex items-center gap-1">
                          {index > 0 ? <span className="text-xs text-fg-muted">or</span> : null}
                          <kbd className="rounded-xs border border-border bg-surface-subtle px-1.5 py-0.5 font-sans text-xs whitespace-nowrap text-fg">
                            {comboLabel(combo, isApple)}
                          </kbd>
                        </span>
                      ))}
                    </dt>
                    <dd className="text-fg-muted">{entry.description}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  )
}
