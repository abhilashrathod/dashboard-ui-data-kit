import { ORDER_STATUSES } from '@/contracts'
import preview from '../../../.storybook/preview'
import { StoryMatrix } from '@/dev/StoryMatrix'
import { StatusPill } from './StatusPill'

const meta = preview.meta({
  title: 'Components/StatusPill',
  component: StatusPill,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `An order status as a dotted Badge. Tones and labels come from one exported map, \`ORDER_STATUS_DISPLAY\`.

**Do**
- Use it wherever an order status is shown (tables, detail panels, filters), so a status always looks the same.

**Don't**
- Don't re-map statuses to tones locally; change \`ORDER_STATUS_DISPLAY\` instead.`,
      },
    },
  },
  args: { status: 'paid' },
})

export const Playground = meta.story({ args: { status: 'paid' } })

export const AllStatuses = meta.story({
  name: 'All variants',
  render: () => (
    <StoryMatrix>
      <ul className="flex flex-wrap gap-2" aria-label="Order statuses">
        {ORDER_STATUSES.map((status) => (
          <li key={status}>
            <StatusPill status={status} />
          </li>
        ))}
      </ul>
    </StoryMatrix>
  ),
})
