import { useId, useState } from 'react'
import { expect, waitFor, within } from 'storybook/test'
import preview from '../../../.storybook/preview'
import { openOverlayA11y } from '@/dev/a11y'
import { Select, type SelectOption } from './Select'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'failed', label: 'Failed', disabled: true },
]

const COUNTRIES: SelectOption[] = [
  'Argentina',
  'Australia',
  'Austria',
  'Belgium',
  'Brazil',
  'Canada',
  'Chile',
  'Denmark',
  'Finland',
  'France',
  'Germany',
  'India',
  'Ireland',
  'Italy',
  'Japan',
  'Mexico',
  'Netherlands',
  'New Zealand',
  'Norway',
  'Portugal',
  'Spain',
  'Sweden',
  'Switzerland',
  'United Kingdom',
  'United States',
].map((name) => ({ value: name.toLowerCase().replaceAll(' ', '-'), label: name }))

const meta = preview.meta({
  title: 'Overlays/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Pick one value from a list. The trigger is the Input pill (same tone, sizes and invalid state) with a chevron.

Simple API: \`<Select value onValueChange options={[{ value, label, disabled? }]} placeholder aria-label />\`. For custom items (icons, groups), compose \`Select.Root\`, \`Select.Trigger\`, \`Select.Content\`, \`Select.Item\`, \`Select.Group\`, \`Select.Label\`.

The list opens below the trigger, is at least as wide, and scrolls past 20rem.

**Do**
- Give it a visible label (\`id\` + \`<label htmlFor>\`) or an \`aria-label\`.
- Pair \`invalid\` with visible error text.

**Don't**
- Don't use it for fewer than ~4 options shown side by side; a segmented control or radio group is quicker.
- Don't use it for actions; that's a DropdownMenu.`,
      },
    },
  },
  args: { options: STATUS_OPTIONS, 'aria-label': 'Status' },
})

function Labelled(props: Partial<React.ComponentProps<typeof Select>>) {
  const id = useId()
  const [value, setValue] = useState<string | undefined>(props.defaultValue)
  return (
    <div className="flex max-w-xs flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        Status
      </label>
      <Select id={id} options={STATUS_OPTIONS} value={value} onValueChange={setValue} {...props} />
      <p className="text-sm text-fg-muted">
        Value: <span data-testid="value">{value ?? '(none)'}</span>
      </p>
    </div>
  )
}

export const Default = meta.story({ render: () => <Labelled defaultValue="paid" /> })

/** Keyboard: open with Enter, move with arrows, choose with Enter. */
export const Placeholder = meta.story({
  render: () => <Labelled placeholder="Choose a status" />,
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Status' })
    await expect(trigger).toHaveTextContent('Choose a status')
    await userEvent.tab()
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    const body = within(document.body)
    await body.findByRole('listbox')
    await waitFor(() => expect(body.getByRole('option', { name: 'Pending' })).toHaveFocus())
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{Enter}')
    await expect(trigger).toHaveTextContent('Paid')
    await expect(canvas.getByTestId('value')).toHaveTextContent('paid')
    await waitFor(() => expect(trigger).toHaveFocus())
  },
})

export const Invalid = meta.story({
  render: function Render() {
    const id = useId()
    return (
      <div className="flex max-w-xs flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          Status
        </label>
        <Select
          id={id}
          options={STATUS_OPTIONS}
          placeholder="Choose a status"
          invalid
          aria-describedby={`${id}-error`}
        />
        <p id={`${id}-error`} className="text-sm text-status-danger-fg">
          Choose a status to continue.
        </p>
      </div>
    )
  },
})

export const Sizes = meta.story({
  render: () => (
    <div className="flex max-w-xs flex-col gap-2">
      <Select size="sm" options={STATUS_OPTIONS} defaultValue="paid" aria-label="Status (sm)" />
      <Select size="md" options={STATUS_OPTIONS} defaultValue="paid" aria-label="Status (md)" />
      <Select size="lg" options={STATUS_OPTIONS} defaultValue="paid" aria-label="Status (lg)" />
    </div>
  ),
})

export const Compact = meta.story({
  globals: { density: 'compact' },
  render: () => <Labelled defaultValue="shipped" />,
})

export const ManyOptions = meta.story({
  name: 'Many options (scroll)',
  render: () => (
    <Select options={COUNTRIES} placeholder="Country" aria-label="Country" className="max-w-xs" />
  ),
})

/** Open on load (disabled option visible) so the a11y check scans the list. */
export const Open = meta.story({
  tags: ['!autodocs'],
  parameters: openOverlayA11y,
  render: () => <Labelled defaultValue="paid" defaultOpen />,
})

export const OpenDarkCompact = meta.story({
  tags: ['!autodocs'],
  parameters: {
    a11y: {
      ...openOverlayA11y.a11y,
      // The long list scrolls, and its options use roving focus (tabindex=-1),
      // so axe sees no tab stop inside. Keyboard users scroll it with arrows,
      // Home/End and typeahead, which move focus to the options.
      config: { rules: [{ id: 'scrollable-region-focusable', enabled: false }] },
    },
  },
  globals: { theme: 'dark', density: 'compact' },
  render: () => (
    <Select
      options={COUNTRIES}
      defaultValue="france"
      defaultOpen
      aria-label="Country"
      className="max-w-xs"
    />
  ),
})
