import { ArrowRight, Download, Plus, Trash2 } from 'lucide-react'
import { expect, fn } from 'storybook/test'
import preview from '../../../.storybook/preview'
import { StoryMatrix, StoryRow } from '@/dev/StoryMatrix'
import { Button } from './Button'

const VARIANTS = ['primary', 'accent', 'secondary', 'outline', 'ghost', 'danger'] as const
const SIZES = ['sm', 'md', 'lg'] as const

const meta = preview.meta({
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A pill button. Heights come from the density tokens, so compact density shrinks it.

**Do**
- Use **one primary** (ink) button per section. Accent is for the single brand action on a screen.
- Use \`loading\` for async actions: it keeps the width and keyboard focus, and swallows clicks.
- Use \`asChild\` to render a link (\`<a>\`) that looks like a button.

**Don't**
- Don't put two primary buttons side by side; make one secondary or outline.
- Don't use \`danger\` without a confirmation step for destructive actions.
- Don't pass a bare icon with no label; use \`IconButton\`, which requires an aria-label.`,
      },
    },
  },
  args: { children: 'Export', onClick: fn() },
})

export const Playground = meta.story({
  args: { variant: 'primary', size: 'md', loading: false, disabled: false },
})

export const AllVariants = meta.story({
  name: 'All variants',
  render: () => (
    <StoryMatrix>
      <div className="flex flex-col gap-3">
        {VARIANTS.map((variant) => (
          <StoryRow key={variant} label={variant}>
            {SIZES.map((size) => (
              <Button key={size} variant={variant} size={size}>
                {size}
              </Button>
            ))}
            <Button variant={variant} leftIcon={<Download />}>
              Icon
            </Button>
            <Button variant={variant} disabled>
              Disabled
            </Button>
            <Button variant={variant} loading>
              Loading
            </Button>
            <Button variant={variant} loading leftIcon={<Download />}>
              Saving
            </Button>
          </StoryRow>
        ))}
      </div>
    </StoryMatrix>
  ),
})

export const WithIcons = meta.story({
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button leftIcon={<Plus />}>New order</Button>
      <Button variant="outline" rightIcon={<ArrowRight />}>
        View report
      </Button>
      <Button variant="danger" leftIcon={<Trash2 />}>
        Delete
      </Button>
    </div>
  ),
})

export const AsLink = meta.story({
  name: 'As link (asChild)',
  render: () => (
    <Button asChild variant="outline" rightIcon={<ArrowRight />}>
      <a href="#orders">Go to orders</a>
    </Button>
  ),
})

/** Clicking while loading does nothing; the button stays focusable and announces busy. */
export const Loading = meta.story({
  args: { loading: true, children: 'Save changes' },
  play: async ({ canvas, args, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'Save changes' })
    await expect(button).toHaveAttribute('aria-busy', 'true')
    await expect(button).toHaveAttribute('data-loading')
    await userEvent.click(button)
    await expect(args.onClick).not.toHaveBeenCalled()
    await expect(button).toHaveFocus()
  },
})
