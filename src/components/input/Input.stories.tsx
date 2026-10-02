import { AtSign, Search } from 'lucide-react'
import { useId, useState } from 'react'
import { expect } from 'storybook/test'
import preview from '../../../.storybook/preview'
import { StoryMatrix, StoryRow } from '@/dev/StoryMatrix'
import { Input } from './Input'
import { SearchInput } from './SearchInput'

const meta = preview.meta({
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A pill text field on surface-subtle. The edge appears on hover and focus; the focus ring shows on the pill.

**Do**
- Always give it a visible \`<label>\` or an \`aria-label\`. The placeholder is a hint, not a label (it's only 3:1).
- Pair \`invalid\` with visible error text, linked with \`aria-describedby\`. The red edge alone is color only.
- Use \`SearchInput\` for search: icon, "Clear search" button, and focus back in the field after clearing.

**Don't**
- Don't put essential instructions in the placeholder.
- Don't add margins; lay it out from the parent.`,
      },
    },
  },
  args: { 'aria-label': 'Email', placeholder: 'name@example.com' },
})

export const Playground = meta.story({
  args: { size: 'md', invalid: false, disabled: false },
})

function Kbd() {
  return (
    <kbd className="rounded-xs bg-surface-muted px-1.5 font-sans text-xs text-fg-muted">⌘K</kbd>
  )
}

export const AllVariants = meta.story({
  name: 'All variants',
  render: () => (
    <StoryMatrix>
      <div className="flex max-w-md flex-col gap-3">
        {(['sm', 'md', 'lg'] as const).map((size) => (
          <StoryRow key={size} label={size}>
            <Input
              size={size}
              aria-label={`Name (${size})`}
              placeholder="Placeholder"
              className="flex-1"
            />
          </StoryRow>
        ))}
        <StoryRow label="adornments">
          <Input
            aria-label="Command"
            placeholder="Jump to…"
            leftAdornment={<Search />}
            rightAdornment={<Kbd />}
            className="flex-1"
          />
        </StoryRow>
        <StoryRow label="filled">
          <Input
            aria-label="Email (filled)"
            defaultValue="ada@example.com"
            leftAdornment={<AtSign />}
            className="flex-1"
          />
        </StoryRow>
        <StoryRow label="invalid">
          <Input
            aria-label="Email (invalid)"
            defaultValue="not-an-email"
            invalid
            className="flex-1"
          />
        </StoryRow>
        <StoryRow label="disabled">
          <Input aria-label="Email (disabled)" placeholder="Disabled" disabled className="flex-1" />
        </StoryRow>
        <StoryRow label="search">
          <SearchInput
            aria-label="Search orders"
            placeholder="Search orders"
            defaultValue="ORD-0001"
            className="flex-1"
          />
        </StoryRow>
      </div>
    </StoryMatrix>
  ),
})

/** With a visible label and error text: the complete accessible pattern. */
export const WithLabelAndError = meta.story({
  render: function Render() {
    const id = useId()
    return (
      <div className="flex max-w-sm flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          Email
        </label>
        <Input id={id} defaultValue="not-an-email" invalid aria-describedby={`${id}-error`} />
        <p id={`${id}-error`} className="text-sm text-status-danger-fg">
          Enter a valid email address.
        </p>
      </div>
    )
  },
})

/** Type, clear with the button, and focus returns to the field. */
export const SearchInputStory = meta.story({
  name: 'SearchInput',
  render: function Render() {
    const [query, setQuery] = useState('')
    return (
      <div className="flex max-w-sm flex-col gap-2">
        <SearchInput
          aria-label="Search orders"
          placeholder="Search orders"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <p className="text-sm text-fg-muted">
          Query: <span data-testid="query">{query || '(empty)'}</span>
        </p>
      </div>
    )
  },
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole('searchbox', { name: 'Search orders' })
    await expect(canvas.queryByRole('button', { name: 'Clear search' })).toBeNull()

    await userEvent.type(input, 'ada')
    await expect(input).toHaveValue('ada')
    await expect(canvas.getByTestId('query')).toHaveTextContent('ada')

    await userEvent.click(canvas.getByRole('button', { name: 'Clear search' }))
    await expect(input).toHaveValue('')
    await expect(canvas.getByTestId('query')).toHaveTextContent('(empty)')
    await expect(input).toHaveFocus()
    await expect(canvas.queryByRole('button', { name: 'Clear search' })).toBeNull()
  },
})
