import { SlidersHorizontal } from 'lucide-react'
import { useId } from 'react'
import { expect, waitFor, within } from 'storybook/test'
import preview from '../../../.storybook/preview'
import { openOverlayA11y } from '@/dev/a11y'
import { Button } from '../button'
import { Input } from '../input'
import { Popover } from './Popover'

const meta = preview.meta({
  title: 'Overlays/Popover',
  component: Popover,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A non-modal panel anchored to a trigger: \`Popover\`, \`Popover.Trigger\` (usually \`asChild\` around a Button), \`Popover.Content\` (portaled; sideOffset 8, collisionPadding 12, space-tile padding), \`Popover.Close\`.

Set the width on the content with \`className\` (e.g. \`w-72\`).

**Do**
- Use it for small, contextual controls: a filter form, a date range, details on demand.
- Give the content a heading or an \`aria-label\` when it holds a form.

**Don't**
- Don't use it for a list of actions; that's a DropdownMenu (it adds menu keyboard behavior).
- Don't put a long flow in it; use a Drawer or Dialog.`,
      },
    },
  },
})

function Basic({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <Popover defaultOpen={defaultOpen}>
      <Popover.Trigger asChild>
        <Button variant="outline">About this metric</Button>
      </Popover.Trigger>
      <Popover.Content className="w-72" aria-label="About this metric">
        <p className="font-medium">Net revenue</p>
        <p className="mt-1 text-sm text-fg-muted">
          Paid orders minus refunds, in USD, for the selected period.
        </p>
      </Popover.Content>
    </Popover>
  )
}

export const BasicStory = meta.story({ name: 'Basic', render: () => <Basic /> })

function FilterForm({ defaultOpen }: { defaultOpen?: boolean }) {
  const minId = useId()
  const maxId = useId()
  return (
    <Popover defaultOpen={defaultOpen}>
      <Popover.Trigger asChild>
        <Button variant="secondary" leftIcon={<SlidersHorizontal />}>
          Amount
        </Button>
      </Popover.Trigger>
      <Popover.Content className="w-80" aria-labelledby={`${minId}-title`}>
        <form className="flex flex-col gap-3" onSubmit={(event) => event.preventDefault()}>
          <p id={`${minId}-title`} className="font-medium">
            Filter by amount
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={minId} className="text-sm text-fg-muted">
                Min
              </label>
              <Input id={minId} size="sm" inputMode="decimal" placeholder="0" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={maxId} className="text-sm text-fg-muted">
                Max
              </label>
              <Input id={maxId} size="sm" inputMode="decimal" placeholder="Any" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Popover.Close asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </Popover.Close>
            <Button size="sm" type="submit">
              Apply
            </Button>
          </div>
        </form>
      </Popover.Content>
    </Popover>
  )
}

export const WithForm = meta.story({
  render: () => <FilterForm />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Amount' }))
    const body = within(document.body)
    const min = await body.findByLabelText('Min')
    await userEvent.type(min, '50')
    await expect(min).toHaveValue('50')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Amount' })).toHaveFocus())
  },
})

/** Open on load so the a11y check scans the portaled content. */
export const Open = meta.story({
  tags: ['!autodocs'],
  parameters: openOverlayA11y,
  render: () => <FilterForm defaultOpen />,
})

export const OpenDarkCompact = meta.story({
  tags: ['!autodocs'],
  parameters: openOverlayA11y,
  globals: { theme: 'dark', density: 'compact' },
  render: () => <Basic defaultOpen />,
})
