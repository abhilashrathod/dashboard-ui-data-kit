import { expect, waitFor, within } from 'storybook/test'
import preview from '../../../.storybook/preview'
import { openOverlayA11y } from '@/dev/a11y'
import { Button } from '../button'
import { StatusPill } from '../status-pill'
import { Drawer } from './Drawer'

const meta = preview.meta({
  title: 'Overlays/Drawer',
  component: Drawer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A full-height side panel from the right, built on Radix Dialog: same focus trap, Escape, focus return and **title requirement** as Dialog.

Parts: Drawer, Drawer.Trigger, Drawer.Content (\`size\` sm 380px | md 480px | lg 640px, never wider than the viewport), Drawer.Header (stays at the top: title, description, close button), Drawer.Body (the only part that scrolls), Drawer.Footer (stays at the bottom: actions, primary last), Drawer.Close.

**Do**
- Use it for details and longer forms that relate to the page behind (e.g. an order's details from the table).

**Don't**
- Don't stack drawers; replace the content instead.`,
      },
    },
  },
})

const EVENTS = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  label: ['Order placed', 'Payment captured', 'Label printed', 'Shipped', 'Note added'][index % 5],
  time: `Sep ${30 - Math.floor(index / 3)}, ${String(9 + (index % 9)).padStart(2, '0')}:${index % 2 ? '30' : '05'}`,
}))

function OrderDrawer({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <Drawer defaultOpen={defaultOpen}>
      <Drawer.Trigger asChild>
        <Button variant="outline">Order details</Button>
      </Drawer.Trigger>
      <Drawer.Content size="md">
        <Drawer.Header>
          <Drawer.Title>ORD-000123</Drawer.Title>
          <Drawer.Description>Ada Lovelace · $1,240.00</Drawer.Description>
        </Drawer.Header>
        <Drawer.Body aria-label="Order history">
          <div className="mb-4">
            <StatusPill status="shipped" />
          </div>
          <ol className="flex flex-col gap-3">
            {EVENTS.map((event) => (
              <li
                key={event.id}
                className="flex justify-between gap-4 rounded-md bg-surface-subtle p-tile"
              >
                <span>{event.label}</span>
                <span className="text-sm text-fg-muted tabular">{event.time}</span>
              </li>
            ))}
          </ol>
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button variant="ghost">Close</Button>
          </Drawer.Close>
          <Button>Refund order</Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

/** Long body scrolls under a fixed header and footer; Close returns focus. */
export const LongBody = meta.story({
  render: () => <OrderDrawer />,
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Order details' })
    const body = within(document.body)
    await userEvent.click(trigger)
    const drawer = await body.findByRole('dialog', { name: 'ORD-000123' })
    await waitFor(() => expect(drawer).toHaveFocus())

    // The top-right close button (aria-label "Close"), not the footer one.
    const closeButtons = within(drawer).getAllByRole('button', { name: 'Close' })
    const iconClose = closeButtons.find((button) => button.getAttribute('aria-label') === 'Close')
    await userEvent.click(iconClose!)
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(trigger).toHaveFocus())
  },
})

export const Open = meta.story({
  tags: ['!autodocs'],
  parameters: openOverlayA11y,
  render: () => <OrderDrawer defaultOpen />,
})

export const OpenDarkCompact = meta.story({
  tags: ['!autodocs'],
  parameters: openOverlayA11y,
  globals: { theme: 'dark', density: 'compact' },
  render: () => <OrderDrawer defaultOpen />,
})
