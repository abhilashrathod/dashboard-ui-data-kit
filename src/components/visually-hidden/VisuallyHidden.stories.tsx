import preview from '../../../.storybook/preview'
import { VisuallyHidden } from './VisuallyHidden'

const meta = preview.meta({
  title: 'Components/VisuallyHidden',
  component: VisuallyHidden,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Text for screen readers only (the \`sr-only\` technique: off-screen, still in the accessibility tree).

**Do**
- Use it to complete a meaning that's visual only, e.g. "Increased 7%" behind an arrow.

**Don't**
- Don't hide text that sighted users need too, and don't use it to stuff keywords.`,
      },
    },
  },
})

export const Playground = meta.story({
  render: () => (
    <p>
      The next sentence is only for screen readers.
      <VisuallyHidden> You found the hidden sentence.</VisuallyHidden>
    </p>
  ),
})
