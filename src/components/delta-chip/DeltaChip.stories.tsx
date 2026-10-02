import preview from '../../../.storybook/preview'
import { StoryMatrix, StoryRow } from '@/dev/StoryMatrix'
import { DeltaChip } from './DeltaChip'

const meta = preview.meta({
  title: 'Components/DeltaChip',
  component: DeltaChip,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `The percent change between two values. The arrow shows the direction; the tone shows whether that's good (\`goodWhen\`). Screen readers hear one sentence, e.g. "Increased 7% vs last 30 days".

When \`previous\` is 0, the change has no finite percent, so the chip shows **"New"** in a neutral tone (never "Infinity%").

**Do**
- Set \`goodWhen="down"\` for metrics where lower is better (refund rate, latency, churn).
- Pass \`periodLabel\` so the sentence says what it's compared with.

**Don't**
- Don't use it for absolute differences ("+$120"); it shows relative change only.`,
      },
    },
  },
  args: { current: 107, previous: 100, goodWhen: 'up', periodLabel: 'vs last 30 days' },
})

export const Playground = meta.story({
  args: { current: 107, previous: 100, goodWhen: 'up', periodLabel: 'vs last 30 days' },
})

export const AllVariants = meta.story({
  name: 'All variants',
  render: () => (
    <StoryMatrix>
      <div className="flex flex-col gap-3">
        <StoryRow label="revenue up">
          <DeltaChip current={48210} previous={42890} goodWhen="up" periodLabel="vs last 30 days" />
          <span className="text-sm text-fg-muted">good: success</span>
        </StoryRow>
        <StoryRow label="revenue down">
          <DeltaChip current={39100} previous={42890} goodWhen="up" periodLabel="vs last 30 days" />
          <span className="text-sm text-fg-muted">bad: danger</span>
        </StoryRow>
        <StoryRow label="refunds up">
          <DeltaChip current={2.5} previous={2.1} goodWhen="down" periodLabel="vs last 30 days" />
          <span className="text-sm text-fg-muted">bad: danger</span>
        </StoryRow>
        <StoryRow label="unchanged">
          <DeltaChip current={1284} previous={1284} goodWhen="up" periodLabel="vs last 30 days" />
          <span className="text-sm text-fg-muted">neutral</span>
        </StoryRow>
        <StoryRow label="from zero">
          <DeltaChip current={320} previous={0} goodWhen="up" periodLabel="vs last 30 days" />
          <span className="text-sm text-fg-muted">neutral, "New"</span>
        </StoryRow>
      </div>
    </StoryMatrix>
  ),
})
