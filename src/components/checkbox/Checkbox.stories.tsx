import { useState } from 'react'
import { expect } from 'storybook/test'
import preview from '../../../.storybook/preview'
import { StoryMatrix, StoryRow } from '@/dev/StoryMatrix'
import { Checkbox } from './Checkbox'

const meta = preview.meta({
  title: 'Components/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A restyled native checkbox: native semantics, Space toggles, and it works in forms. The 18px box sits in a 24×24px hit area.

**Do**
- Use \`label\` for a visible label; in table rows without one, pass \`aria-label\` (e.g. "Select ORD-000123").
- Use \`indeterminate\` for a "select all" checkbox when only some rows are selected.

**Don't**
- Don't use it for an instant on/off setting; that's a switch (coming with Radix in 2c).`,
      },
    },
  },
  args: { label: 'Email me receipts' },
})

export const Playground = meta.story({
  args: { disabled: false, indeterminate: false, defaultChecked: false },
})

export const AllVariants = meta.story({
  name: 'All variants',
  render: () => (
    <StoryMatrix>
      <div className="flex flex-col gap-3">
        <StoryRow label="unchecked">
          <Checkbox label="Unchecked" />
          <Checkbox aria-label="Unchecked, no label" />
        </StoryRow>
        <StoryRow label="checked">
          <Checkbox label="Checked" defaultChecked />
          <Checkbox aria-label="Checked, no label" defaultChecked />
        </StoryRow>
        <StoryRow label="indeterminate">
          <Checkbox label="Some selected" indeterminate />
        </StoryRow>
        <StoryRow label="disabled">
          <Checkbox label="Disabled" disabled />
          <Checkbox label="Disabled, checked" disabled defaultChecked />
        </StoryRow>
      </div>
    </StoryMatrix>
  ),
})

/** Keyboard: Tab to it, Space toggles. */
export const Keyboard = meta.story({
  args: { label: 'Toggle me' },
  play: async ({ canvas, userEvent }) => {
    const checkbox = canvas.getByRole('checkbox', { name: 'Toggle me' })
    await userEvent.tab()
    await expect(checkbox).toHaveFocus()
    await userEvent.keyboard(' ')
    await expect(checkbox).toBeChecked()
    await userEvent.keyboard(' ')
    await expect(checkbox).not.toBeChecked()
  },
})

/** "Select all" over three rows: the header shows a dash and reports mixed. */
export const Indeterminate = meta.story({
  render: function Render() {
    const [rows, setRows] = useState([true, false, false])
    const all = rows.every(Boolean)
    const some = rows.some(Boolean)
    return (
      <div className="flex flex-col gap-1">
        <Checkbox
          label="Select all"
          checked={all}
          indeterminate={some && !all}
          onChange={() => setRows(rows.map(() => !all))}
        />
        {rows.map((checked, index) => (
          <Checkbox
            key={index}
            label={`Order ${index + 1}`}
            checked={checked}
            onChange={() => setRows(rows.map((value, i) => (i === index ? !value : value)))}
            className="pl-6"
          />
        ))}
      </div>
    )
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const selectAll = canvas.getByRole('checkbox', { name: 'Select all' })
    await expect(selectAll).toBePartiallyChecked()
    const dash = canvasElement.querySelector('[data-slot="dash"]')
    await expect(dash).toBeVisible()

    await userEvent.click(selectAll)
    await expect(selectAll).toBeChecked()
    await expect(selectAll).not.toBePartiallyChecked()
    await expect(dash).not.toBeVisible()
  },
})
