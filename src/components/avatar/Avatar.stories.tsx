import preview from '../../../.storybook/preview'
import { StoryMatrix, StoryRow } from '@/dev/StoryMatrix'
import { Avatar } from './Avatar'

const NAMES = [
  'Ada Lovelace',
  'Grace Hopper',
  'Linus',
  'Margaret Heafield Hamilton',
  'Alan Turing',
  'Ken Thompson',
]

const meta = preview.meta({
  title: 'Components/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Initials in a circle. The tone comes from a hash of the name, so a customer keeps the same color everywhere, on every machine. The palette uses tone pairs already tested for 4.5:1 (danger is left out: a red avatar reads as an alert).

**Do**
- Pass \`decorative\` when the name is shown next to it (table cells, lists): it's then hidden from screen readers.

**Don't**
- Don't use the color to mean anything: it's arbitrary by design.`,
      },
    },
  },
  args: { name: 'Ada Lovelace' },
})

export const Playground = meta.story({ args: { size: 'md', decorative: false } })

export const AllVariants = meta.story({
  name: 'All variants',
  render: () => (
    <StoryMatrix>
      <div className="flex flex-col gap-3">
        {(['sm', 'md'] as const).map((size) => (
          <StoryRow key={size} label={size}>
            {NAMES.map((name) => (
              <Avatar key={name} name={name} size={size} />
            ))}
          </StoryRow>
        ))}
      </div>
    </StoryMatrix>
  ),
})
