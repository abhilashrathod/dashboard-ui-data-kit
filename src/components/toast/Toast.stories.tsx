import { expect, waitFor, within } from 'storybook/test'
import preview from '../../../.storybook/preview'
import { Button } from '../button'
import { ToastProvider, useToast } from './Toast'

const meta = preview.meta({
  title: 'Overlays/Toast',
  component: ToastProvider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Short, non-blocking feedback in the bottom-right. KitProvider renders the provider and viewport; call \`useToast()\`:

\`\`\`tsx
const { toast, dismiss } = useToast()
const id = toast({ title: 'Order refunded', tone: 'success', action: { label: 'Undo', onClick: undo } })
\`\`\`

\`tone\`: default | success | danger (a colored bar; the title carries the meaning). Duration 5s, or 8s for danger. Timers pause on hover and focus. At most 3 are visible; older ones are dismissed. Announced politely. F8 jumps to the toasts.

**Toast or announce?** A toast is **visible** feedback for everyone. For state changes the user caused that have no visible message (sort order, result counts), use \`useAnnounce()\`.

**Do**
- Confirm completed actions ("3 orders marked shipped"), and offer Undo for reversible ones.

**Don't**
- Don't put errors that block the user's task in a toast; show them inline.
- Don't put the only path to an action in a toast; it disappears.`,
      },
    },
  },
})

function Demo() {
  const { toast } = useToast()
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => toast({ title: 'Filters saved' })}>
        Default
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({ title: 'Order refunded', description: 'ORD-000123 · $80.00', tone: 'success' })
        }
      >
        Success
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            title: 'Export failed',
            description: 'The server timed out. Try a smaller date range.',
            tone: 'danger',
          })
        }
      >
        Danger
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            title: '3 orders archived',
            action: { label: 'Undo', onClick: () => toast({ title: 'Restored 3 orders' }) },
          })
        }
      >
        With Undo
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          for (let i = 1; i <= 5; i += 1) toast({ title: `Toast ${i} of 5` })
        }}
      >
        Burst of 5
      </Button>
    </div>
  )
}

/** The polite announcement Radix makes for a toast: a role="status" element with its text. */
const announcementWith = (text: string) =>
  waitFor(() => {
    const match = within(document.body)
      .getAllByRole('status')
      .find((element) => element.textContent?.includes(text))
    if (!match) throw new Error(`No role="status" announcement containing "${text}"`)
    return match
  })

/** Toasts are list items in the "Notifications" region (the viewport). */
const openToasts = () => {
  const viewport = within(document.body).getByRole('region', { name: /Notifications/ })
  return within(viewport)
    .queryAllByRole('listitem')
    .filter((element) => element.dataset.state === 'open')
}

const toastWith = (text: string) =>
  waitFor(() => {
    const match = openToasts().find((element) => element.textContent?.includes(text))
    if (!match) throw new Error(`No open toast containing "${text}"`)
    return match
  })

/** Firing a toast shows a role=status element; Dismiss removes it. */
export const Tones = meta.story({
  render: () => <Demo />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Success' }))
    await announcementWith('Order refunded')
    const toast = await toastWith('Order refunded')
    // Wait out the enter animation (it starts at opacity 0).
    await waitFor(() => expect(toast).toBeVisible())

    await userEvent.click(within(toast).getByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(toast).not.toBeInTheDocument())
  },
})

/** Five fired at once: only the newest three stay. */
export const Burst = meta.story({
  render: () => <Demo />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Burst of 5' }))
    await toastWith('Toast 5 of 5')
    await waitFor(() => {
      const open = openToasts().map((element) => element.textContent ?? '')
      if (open.length !== 3) throw new Error(`Expected 3 open toasts, found ${open.length}`)
      if (open.some((text) => text.includes('Toast 1 of 5') || text.includes('Toast 2 of 5'))) {
        throw new Error('The two oldest toasts should have been dismissed')
      }
    })
  },
})

/** One of each tone left open (dark, compact) for the a11y scan. */
export const AllTonesDarkCompact = meta.story({
  tags: ['!autodocs'],
  globals: { theme: 'dark', density: 'compact' },
  render: () => <Demo />,
  play: async ({ canvas, userEvent }) => {
    for (const name of ['Default', 'Success', 'Danger']) {
      await userEvent.click(canvas.getByRole('button', { name }))
    }
    await toastWith('Export failed')
  },
})

export const WithActionLight = meta.story({
  tags: ['!autodocs'],
  render: () => <Demo />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'With Undo' }))
    const toast = await toastWith('3 orders archived')
    await waitFor(() => expect(within(toast).getByRole('button', { name: 'Undo' })).toBeVisible())
  },
})
