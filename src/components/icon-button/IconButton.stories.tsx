import { Bell, MoreHorizontal, RefreshCw, X } from 'lucide-react'
import { fn } from 'storybook/test'
import preview from '../../../.storybook/preview'
import { StoryMatrix, StoryRow } from '@/dev/StoryMatrix'
import { IconButton } from './IconButton'

const VARIANTS = ['primary', 'secondary', 'outline', 'ghost'] as const
const SIZES = ['sm', 'md', 'lg'] as const

const meta = preview.meta({
  title: 'Components/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A circular button with a single icon. Its type **requires** \`aria-label\` (or \`aria-labelledby\`), because an icon has no text.

**Do**
- Name it for the action, not the icon: "Clear search", not "X".
- Use \`ghost\` inside inputs and dense rows, and \`secondary\` in toolbars.

**Don't**
- Don't use it for primary actions that need a visible label; use \`Button\` with \`leftIcon\`.`,
      },
    },
  },
  args: { 'aria-label': 'Notifications', children: <Bell />, onClick: fn() },
})

export const Playground = meta.story({
  args: { variant: 'secondary', size: 'md', loading: false, disabled: false },
})

export const AllVariants = meta.story({
  name: 'All variants',
  render: () => (
    <StoryMatrix>
      <div className="flex flex-col gap-3">
        {VARIANTS.map((variant) => (
          <StoryRow key={variant} label={variant}>
            {SIZES.map((size) => (
              <IconButton key={size} variant={variant} size={size} aria-label={`More (${size})`}>
                <MoreHorizontal />
              </IconButton>
            ))}
            <IconButton variant={variant} aria-label="Close" disabled>
              <X />
            </IconButton>
            <IconButton variant={variant} aria-label="Refresh" loading>
              <RefreshCw />
            </IconButton>
          </StoryRow>
        ))}
      </div>
    </StoryMatrix>
  ),
})
