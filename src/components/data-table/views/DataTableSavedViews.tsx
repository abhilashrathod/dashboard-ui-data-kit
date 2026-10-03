import { Check, ChevronDown, Copy, Ellipsis, Link2, Pencil, Save, Trash2 } from 'lucide-react'
import { DropdownMenu as Menu } from 'radix-ui'
import { useRef, useState } from 'react'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { cn } from '@/lib/cn'
import { useUrlAdapter } from '@/lib/url-state'
import { Button } from '../../button'
import { ConfirmDialog } from '../../dialog'
import { DropdownMenu } from '../../dropdown-menu'
import { menuItemVariants } from '../../overlay'
import { useToast } from '../../toast'
import { VisuallyHidden } from '../../visually-hidden'
import { useDataTableContext } from '../context'
import type { ToolbarSlot } from '../DataTableToolbar'
import {
  nameTaken,
  newViewId,
  readLastViewId,
  readStoredViews,
  resolvePreset,
  resolveStored,
  VIEW_NAME_MAX,
  viewKeyOf,
  viewLink,
  writeLastViewId,
  writeStoredViews,
  type ResolvedView,
  type StoredView,
  type ViewPreset,
} from './savedViews'
import { ViewNameDialog } from './ViewNameDialog'

export interface DataTableSavedViewsProps {
  /** Built-in views: always listed, never deletable. */
  presets: readonly ViewPreset[]
  slot?: ToolbarSlot
  className?: string
}

type DialogState =
  | { kind: 'save' }
  | { kind: 'rename'; view: StoredView }
  | { kind: 'delete'; view: StoredView }
  | null

/**
 * "Views": built-in presets and the user's own views (localStorage, per table).
 * A view is a stored URL query; selecting one writes it to the URL (push) and
 * the page goes back to 1. The trigger names the view the params match, or
 * "{name} (edited)" once they drift from the view last applied.
 */
export function DataTableSavedViews({ presets, className }: DataTableSavedViewsProps) {
  const { table } = useDataTableContext('SavedViews')
  const { id: tableId, params, setParams, namespace } = table
  const adapter = useUrlAdapter()
  const { toast } = useToast()
  const copy = useCopyToClipboard()

  const [stored, setStored] = useState(() => readStoredViews(tableId))
  const [lastId, setLastIdState] = useState(() => readLastViewId(tableId))
  const [dialog, setDialog] = useState<DialogState>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  /** A menu item is opening a dialog: don't pull focus back to the trigger behind it. */
  const opening = useRef(false)

  const setLastId = (id: string | null) => {
    writeLastViewId(tableId, id)
    setLastIdState(id)
  }
  const saveStored = (next: StoredView[]) => {
    writeStoredViews(tableId, next)
    setStored(next)
  }

  // Resolved on every render (and so whenever the menu opens): a preset like
  // "last 7 days" follows the date.
  const builtIn = presets.map(resolvePreset)
  const mine = stored.map(resolveStored)
  const all = [...builtIn, ...mine]
  const currentKey = viewKeyOf(params)

  const last = all.find((view) => view.id === lastId)
  // Several views can share a key; prefer the one the user picked.
  const matched =
    last && last.key === currentKey ? last : all.find((view) => view.key === currentKey)
  const edited = !matched && last ? last : undefined
  const editedUserView = edited?.kind === 'user' ? stored.find((v) => v.id === edited.id) : undefined

  const triggerLabel = matched ? matched.name : edited ? `${edited.name} (edited)` : 'Views'

  const applyView = (view: ResolvedView) => {
    setLastId(view.id)
    // Replaces filters, sort, q and page size; the page goes back to 1.
    setParams(() => ({ ...view.params, page: 1 }))
  }

  const validateName = (exceptId?: string) => (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return 'Enter a name'
    if (trimmed.length > VIEW_NAME_MAX) return `Use at most ${VIEW_NAME_MAX} characters`
    if (nameTaken(stored, trimmed, exceptId)) return 'You already have a view with this name'
    return undefined
  }

  const openDialog = (next: DialogState) => {
    opening.current = true
    setDialog(next)
  }

  // Dialogs opened from the menu return focus to the trigger (their menu item is gone).
  const focusTrigger = (event: Event) => {
    event.preventDefault()
    triggerRef.current?.focus()
  }

  const viewItem = (view: ResolvedView) => {
    const active = matched?.id === view.id
    return (
      <DropdownMenu.Item
        key={view.id}
        onSelect={() => applyView(view)}
        icon={
          // An empty slot keeps names aligned when unchecked.
          <span className="inline-flex size-4 items-center justify-center">
            {active ? <Check strokeWidth={2.5} /> : null}
          </span>
        }
        className="min-w-0 flex-1"
      >
        <span className="truncate">{view.name}</span>
        {active ? <VisuallyHidden> (current)</VisuallyHidden> : null}
      </DropdownMenu.Item>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            rightIcon={<ChevronDown />}
            className={cn('max-w-64', matched || edited ? 'bg-accent-subtle text-accent-subtle-fg' : '', className)}
          >
            {matched || edited ? <VisuallyHidden>View: </VisuallyHidden> : null}
            <span className="truncate">{triggerLabel}</span>
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          className="w-72"
          onCloseAutoFocus={(event) => {
            if (!opening.current) return
            opening.current = false
            event.preventDefault()
          }}
        >
          <DropdownMenu.Group>
            <DropdownMenu.Label>Built-in</DropdownMenu.Label>
            {builtIn.map(viewItem)}
          </DropdownMenu.Group>

          {mine.length > 0 ? (
            <>
              <DropdownMenu.Separator />
              <DropdownMenu.Group>
                <DropdownMenu.Label>My views</DropdownMenu.Label>
                {mine.map((view) => {
                  const storedView = stored.find((candidate) => candidate.id === view.id)!
                  return (
                    <div key={view.id} className="flex items-center gap-0.5">
                      {viewItem(view)}
                      <DropdownMenu.Sub>
                        <Menu.SubTrigger
                          aria-label={`More actions for ${view.name}`}
                          className={cn(
                            menuItemVariants(),
                            'shrink-0 justify-center px-2 data-[state=open]:bg-surface-muted',
                          )}
                        >
                          <Ellipsis aria-hidden="true" />
                        </Menu.SubTrigger>
                        <DropdownMenu.SubContent>
                          <DropdownMenu.Item
                            icon={<Pencil />}
                            onSelect={() => openDialog({ kind: 'rename', view: storedView })}
                          >
                            Rename
                          </DropdownMenu.Item>
                          {namespace ? (
                            <DropdownMenu.Item
                              icon={<Link2 />}
                              onSelect={() =>
                                void copy(
                                  viewLink(adapter.getSearch(), namespace, view.params),
                                  'Link copied',
                                )
                              }
                            >
                              Copy link
                            </DropdownMenu.Item>
                          ) : null}
                          <DropdownMenu.Item
                            icon={<Trash2 />}
                            tone="danger"
                            onSelect={() => openDialog({ kind: 'delete', view: storedView })}
                          >
                            Delete
                          </DropdownMenu.Item>
                        </DropdownMenu.SubContent>
                      </DropdownMenu.Sub>
                    </div>
                  )
                })}
              </DropdownMenu.Group>
            </>
          ) : null}

          <DropdownMenu.Separator />
          <DropdownMenu.Item icon={<Save />} onSelect={() => openDialog({ kind: 'save' })}>
            Save current view…
          </DropdownMenu.Item>
          {editedUserView ? (
            <DropdownMenu.Item
              icon={<Check />}
              onSelect={() => {
                saveStored(
                  stored.map((view) =>
                    view.id === editedUserView.id ? { ...view, query: currentKey } : view,
                  ),
                )
                toast({ title: 'View updated', tone: 'success' })
              }}
            >
              <span className="truncate">Save changes to {editedUserView.name}</span>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item
            icon={<Copy />}
            onSelect={() => void copy(window.location.href, 'Link copied')}
          >
            Copy link to this view
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>

      <ViewDialogs
        dialog={dialog}
        close={() => setDialog(null)}
        focusTrigger={focusTrigger}
        validateName={validateName}
        onSave={(name) => {
          const view: StoredView = {
            id: newViewId(),
            name,
            query: currentKey,
            createdAt: new Date().toISOString(),
          }
          saveStored([...stored, view])
          setLastId(view.id)
          toast({ title: 'View saved', tone: 'success' })
        }}
        onRename={(target, name) => {
          saveStored(stored.map((view) => (view.id === target.id ? { ...view, name } : view)))
          toast({ title: 'View renamed', tone: 'success' })
        }}
        onDelete={(target) => {
          saveStored(stored.filter((view) => view.id !== target.id))
          if (lastId === target.id) setLastId(null)
          toast({ title: `Deleted "${target.name}"` })
        }}
      />
    </>
  )
}


function ViewDialogs({
  dialog,
  close,
  focusTrigger,
  validateName,
  onSave,
  onRename,
  onDelete,
}: {
  dialog: DialogState
  close: () => void
  focusTrigger: (event: Event) => void
  validateName: (exceptId?: string) => (name: string) => string | undefined
  onSave: (name: string) => void
  onRename: (view: StoredView, name: string) => void
  onDelete: (view: StoredView) => void
}) {
  // Keep the last dialog's content while it animates out.
  const [shown, setShown] = useState(dialog)
  if (dialog && dialog !== shown) setShown(dialog)
  const onOpenChange = (open: boolean) => {
    if (!open) close()
  }
  const renaming = shown?.kind === 'rename' ? shown.view : undefined
  const deleting = shown?.kind === 'delete' ? shown.view : undefined

  return (
    <>
      <ViewNameDialog
        open={dialog?.kind === 'save'}
        onOpenChange={onOpenChange}
        title="Save current view"
        submitLabel="Save view"
        validate={validateName()}
        onSubmit={(name) => {
          onSave(name)
          close()
        }}
        onCloseAutoFocus={focusTrigger}
      />
      <ViewNameDialog
        open={dialog?.kind === 'rename'}
        onOpenChange={onOpenChange}
        title="Rename view"
        submitLabel="Rename"
        initialName={renaming?.name}
        validate={validateName(renaming?.id)}
        onSubmit={(name) => {
          if (renaming) onRename(renaming, name)
          close()
        }}
        onCloseAutoFocus={focusTrigger}
      />
      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        onOpenChange={onOpenChange}
        tone="danger"
        title={`Delete "${deleting?.name ?? ''}"?`}
        description="The view is removed from this browser. Built-in views aren't affected."
        confirmLabel="Delete view"
        onConfirm={() => {
          if (deleting) onDelete(deleting)
        }}
        onCloseAutoFocus={focusTrigger}
      />
    </>
  )
}
