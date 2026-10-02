import { Trash2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { expect, waitFor, within } from 'storybook/test'
import preview from '../../../.storybook/preview'
import { openOverlayA11y } from '@/dev/a11y'
import { Button } from '../button'
import { Input } from '../input'
import { ConfirmDialog } from './ConfirmDialog'
import { Dialog } from './Dialog'

const meta = preview.meta({
  title: 'Overlays/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A modal dialog: Dialog, Dialog.Trigger, Dialog.Content (\`size\` sm | md | lg; a close button top-right unless \`hideClose\`), Dialog.Header, Dialog.Title, Dialog.Description, Dialog.Body (scrolls), Dialog.Footer (actions right-aligned, **primary last**), Dialog.Close.

Focus moves inside on open and is trapped there; Escape closes; focus returns to the trigger.

**Title required.** Every Dialog.Content needs a Dialog.Title. Radix logs a console error in development without one, and the unit test setup turns that into a failing test. If the title shouldn't show, wrap it in \`<VisuallyHidden asChild>\`.

**ConfirmDialog** is a ready-made "Are you sure?" (an alertdialog). \`onConfirm\` may return a Promise: the button shows loading, resolve closes, and reject keeps the dialog open with the error. Initial focus is on **Cancel** for \`tone="danger"\` (so a reflexive Enter can't destroy anything), and on **Confirm** otherwise.

**Do**
- Name the confirm action ("Delete order", not "OK").
- Keep dialogs short; use a Drawer for long forms or details.

**Don't**
- Don't open a dialog from a dialog.
- Don't use a dialog for non-blocking feedback; use a toast.`,
      },
    },
  },
})

function EditOrder({ defaultOpen }: { defaultOpen?: boolean }) {
  const id = useId()
  return (
    <Dialog defaultOpen={defaultOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline">Edit order</Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Edit ORD-000123</Dialog.Title>
          <Dialog.Description>Changes are saved to the order immediately.</Dialog.Description>
        </Dialog.Header>
        <Dialog.Body className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-sm font-medium">
            Reference
          </label>
          <Input id={id} defaultValue="PO-48210" />
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Close asChild>
            <Button variant="ghost">Cancel</Button>
          </Dialog.Close>
          <Dialog.Close asChild>
            <Button>Save</Button>
          </Dialog.Close>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  )
}

/** Focus moves inside, Tab is trapped, Escape closes, focus returns to the trigger. */
export const Basic = meta.story({
  render: () => <EditOrder />,
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Edit order' })
    const body = within(document.body)

    await userEvent.click(trigger)
    const dialog = await body.findByRole('dialog', { name: 'Edit ORD-000123' })
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))

    // Tab through more stops than the dialog has: focus never leaves it.
    for (let i = 0; i < 6; i += 1) {
      await userEvent.tab()
      await expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
    await userEvent.tab({ shift: true })
    await expect(dialog).toContainElement(document.activeElement as HTMLElement)

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
    await expect(trigger).toHaveFocus()
  },
})

function ConfirmDefault({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [archived, setArchived] = useState(false)
  return (
    <div className="flex items-center gap-3">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Archive order
      </Button>
      <span className="text-sm text-fg-muted">{archived ? 'Archived' : 'Active'}</span>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Archive ORD-000123?"
        description="Archived orders are hidden from the default view. You can restore them later."
        confirmLabel="Archive"
        onConfirm={() => setArchived(true)}
      />
    </div>
  )
}

/** Safe action: initial focus on Confirm, so Enter completes the expected path. */
export const ConfirmDialogDefault = meta.story({
  render: () => <ConfirmDefault />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Archive order' }))
    const body = within(document.body)
    const dialog = await body.findByRole('alertdialog', { name: 'Archive ORD-000123?' })
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: 'Archive' })).toHaveFocus(),
    )
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(body.queryByRole('alertdialog')).toBeNull())
    await expect(canvas.getByText('Archived')).toBeVisible()
  },
})

function ConfirmDanger({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [deleted, setDeleted] = useState(false)
  const attempts = useRef(0)
  return (
    <div className="flex items-center gap-3">
      <Button variant="danger" leftIcon={<Trash2 />} onClick={() => setOpen(true)}>
        Delete order
      </Button>
      <span className="text-sm text-fg-muted">{deleted ? 'Deleted' : 'Not deleted'}</span>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="danger"
        title="Delete ORD-000123?"
        description="This permanently deletes the order and its history."
        confirmLabel="Delete order"
        onConfirm={async () => {
          attempts.current += 1
          await new Promise((resolve) => setTimeout(resolve, 400))
          // Fails the first time, to show the inline error and retry.
          if (attempts.current === 1) throw new Error('Network error: the order was not deleted.')
          setDeleted(true)
        }}
      />
    </div>
  )
}

/** Danger: focus starts on Cancel; the first attempt fails inline, the retry succeeds. */
export const ConfirmDialogDanger = meta.story({
  render: () => <ConfirmDanger />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete order' }))
    const body = within(document.body)
    const dialog = await body.findByRole('alertdialog', { name: 'Delete ORD-000123?' })
    const inDialog = within(dialog)
    await waitFor(() => expect(inDialog.getByRole('button', { name: 'Cancel' })).toHaveFocus())

    const confirm = inDialog.getByRole('button', { name: 'Delete order' })
    await userEvent.click(confirm)
    await expect(confirm).toHaveAttribute('aria-busy', 'true')
    await expect(await inDialog.findByRole('alert')).toHaveTextContent(
      'Network error: the order was not deleted.',
    )
    await expect(dialog).toBeInTheDocument()

    await userEvent.click(confirm)
    await waitFor(() => expect(body.queryByRole('alertdialog')).toBeNull(), { timeout: 3000 })
    await expect(canvas.getByText('Deleted')).toBeVisible()
  },
})

export const Open = meta.story({
  tags: ['!autodocs'],
  parameters: openOverlayA11y,
  render: () => <EditOrder defaultOpen />,
})

export const OpenDarkCompact = meta.story({
  tags: ['!autodocs'],
  parameters: openOverlayA11y,
  globals: { theme: 'dark', density: 'compact' },
  render: () => <EditOrder defaultOpen />,
})

export const OpenConfirmDangerDark = meta.story({
  tags: ['!autodocs'],
  parameters: openOverlayA11y,
  globals: { theme: 'dark' },
  render: () => <ConfirmDanger defaultOpen />,
})
