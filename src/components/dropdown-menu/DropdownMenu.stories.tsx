import { Copy, Download, Ellipsis, Pencil, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { expect, waitFor, within } from 'storybook/test'
import preview from '../../../.storybook/preview'
import { openOverlayA11y } from '@/dev/a11y'
import { Button } from '../button'
import { IconButton } from '../icon-button'
import { DropdownMenu } from './DropdownMenu'

const meta = preview.meta({
  title: 'Overlays/DropdownMenu',
  component: DropdownMenu,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A menu of actions or options. Parts: Root (\`DropdownMenu\`), Trigger, Content, Item (\`icon\`, \`shortcut\`, \`tone="danger"\`), CheckboxItem, RadioGroup / RadioItem, Label, Separator, Group, Sub / SubTrigger / SubContent.

Keyboard: Enter, Space or ArrowDown opens it; arrows move; typing jumps to a matching item; Escape closes it and returns focus to the trigger. Rows follow the density tokens (32px comfortable, 28px compact).

**Keep open on select.** For multi-toggle menus (column visibility, multi-filters), call \`event.preventDefault()\` in the item's \`onSelect\`, so the menu stays open while the user toggles several items:

\`\`\`tsx
<DropdownMenu.CheckboxItem
  checked={visible.email}
  onCheckedChange={(checked) => setVisible({ ...visible, email: checked })}
  onSelect={(event) => event.preventDefault()}
>
  Email
</DropdownMenu.CheckboxItem>
\`\`\`

**Do**
- Put destructive items last, after a separator, with \`tone="danger"\`, and confirm them with a ConfirmDialog.
- Name an icon-only trigger (\`IconButton aria-label="Order actions"\`).

**Don't**
- Don't use a menu for navigation between pages; use links.
- Don't hide the only path to a frequent action in a menu.
- Shortcut hints are visual: bind the keys yourself if you show them.`,
      },
    },
  },
})

function Actions({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenu.Trigger asChild>
        <IconButton aria-label="Order actions">
          <Ellipsis />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>ORD-000123</DropdownMenu.Label>
        <DropdownMenu.Item icon={<Pencil />} shortcut="⌘E">
          Edit
        </DropdownMenu.Item>
        <DropdownMenu.Item icon={<Copy />} shortcut="⌘D">
          Duplicate
        </DropdownMenu.Item>
        <DropdownMenu.Item icon={<Download />}>Export CSV</DropdownMenu.Item>
        <DropdownMenu.Item icon={<Share2 />} disabled>
          Share (disabled)
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item icon={<Trash2 />} tone="danger" shortcut="⌫">
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}

/** Keyboard: Enter opens, ArrowDown moves, typeahead jumps, Escape returns focus. */
export const ActionsStory = meta.story({
  name: 'Actions',
  render: () => <Actions />,
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Order actions' })
    const body = within(document.body)

    await userEvent.tab()
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    const menu = await body.findByRole('menu')
    await waitFor(() => expect(body.getByRole('menuitem', { name: /Edit/ })).toHaveFocus())

    await userEvent.keyboard('{ArrowDown}')
    await expect(body.getByRole('menuitem', { name: /Duplicate/ })).toHaveFocus()

    await userEvent.keyboard('ex')
    await expect(body.getByRole('menuitem', { name: /Export CSV/ })).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(menu).not.toBeInTheDocument())
    await expect(trigger).toHaveFocus()
  },
})

const COLUMNS = ['Order', 'Customer', 'Email', 'Amount', 'Status'] as const

function Columns({ defaultOpen }: { defaultOpen?: boolean }) {
  const [visible, setVisible] = useState<Record<string, boolean>>({
    Order: true,
    Customer: true,
    Email: true,
    Amount: true,
    Status: true,
  })
  return (
    <div className="flex flex-col gap-3">
      <DropdownMenu defaultOpen={defaultOpen}>
        <DropdownMenu.Trigger asChild>
          <Button variant="outline">Columns</Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Label>Visible columns</DropdownMenu.Label>
          {COLUMNS.map((column) => (
            <DropdownMenu.CheckboxItem
              key={column}
              checked={visible[column]}
              disabled={column === 'Order'}
              onCheckedChange={(checked) => setVisible({ ...visible, [column]: checked })}
              // Keep the menu open so several columns can be toggled in a row.
              onSelect={(event) => event.preventDefault()}
            >
              {column}
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu>
      <p className="text-sm text-fg-muted" data-testid="visible">
        Showing: {COLUMNS.filter((column) => visible[column]).join(', ')}
      </p>
    </div>
  )
}

/** Toggling a column keeps the menu open (onSelect → preventDefault). */
export const ColumnsStory = meta.story({
  name: 'Columns (stays open)',
  render: () => <Columns />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Columns' }))
    const body = within(document.body)
    const email = await body.findByRole('menuitemcheckbox', { name: 'Email' })
    await expect(email).toHaveAttribute('aria-checked', 'true')

    await userEvent.click(email)
    await expect(email).toHaveAttribute('aria-checked', 'false')
    await expect(body.getByRole('menu')).toBeVisible()
    await expect(canvas.getByTestId('visible')).not.toHaveTextContent('Email')

    await userEvent.click(body.getByRole('menuitemcheckbox', { name: 'Status' }))
    await expect(body.getByRole('menu')).toBeVisible()
    await userEvent.keyboard('{Escape}')
    // Wait for the exit animation, so the page is no longer aria-hidden when axe runs.
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull())
  },
})

function Sort({ defaultOpen }: { defaultOpen?: boolean }) {
  const [sort, setSort] = useState('newest')
  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary">Sort: {sort}</Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>Sort by</DropdownMenu.Label>
        <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
          <DropdownMenu.RadioItem value="newest">Newest</DropdownMenu.RadioItem>
          <DropdownMenu.RadioItem value="oldest">Oldest</DropdownMenu.RadioItem>
          <DropdownMenu.RadioItem value="amount">Amount</DropdownMenu.RadioItem>
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}

export const RadioGroup = meta.story({ render: () => <Sort /> })

function WithSubmenu({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline">Export</Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item icon={<Download />}>Current view</DropdownMenu.Item>
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger icon={<Share2 />}>Send to…</DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent>
            <DropdownMenu.Item>Email</DropdownMenu.Item>
            <DropdownMenu.Item>Slack</DropdownMenu.Item>
            <DropdownMenu.Item>Google Sheets</DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}

export const Submenu = meta.story({ render: () => <WithSubmenu /> })

export const Open = meta.story({
  tags: ['!autodocs'],
  parameters: openOverlayA11y,
  render: () => <Actions defaultOpen />,
})

export const OpenDarkCompact = meta.story({
  tags: ['!autodocs'],
  parameters: openOverlayA11y,
  globals: { theme: 'dark', density: 'compact' },
  render: () => <Actions defaultOpen />,
})

export const OpenColumnsDark = meta.story({
  tags: ['!autodocs'],
  parameters: openOverlayA11y,
  globals: { theme: 'dark' },
  render: () => <Columns defaultOpen />,
})

export const OpenRadioCompact = meta.story({
  tags: ['!autodocs'],
  parameters: openOverlayA11y,
  globals: { density: 'compact' },
  render: () => <Sort defaultOpen />,
})
