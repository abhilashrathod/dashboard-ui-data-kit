import preview from '../../../.storybook/preview'
import { StoryMatrix, StoryRow } from '@/dev/StoryMatrix'
import { Spinner } from './Spinner'

const meta = preview.meta({
  title: 'Components/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `An SVG ring in \`currentColor\`. Under reduced motion it turns slowly instead of stopping, so it still reads as busy.

**Do**
- Pass \`label\` when the spinner is the only loading signal (it becomes \`role="status"\`).
- Omit \`label\` inside something that already announces busy (e.g. \`Button loading\`).

**Don't**
- Don't use it for page-level loading of known layout; use \`Skeleton\`.`,
      },
    },
  },
})

export const Playground = meta.story({ args: { size: 'md', label: 'Loading orders' } })

export const AllVariants = meta.story({
  name: 'All variants',
  render: () => (
    <StoryMatrix>
      <div className="flex flex-col gap-3">
        <StoryRow label="sizes">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </StoryRow>
        <StoryRow label="colors">
          <Spinner className="text-fg-muted" />
          <Spinner className="text-accent" />
          <Spinner label="Loading" />
        </StoryRow>
      </div>
    </StoryMatrix>
  ),
})
