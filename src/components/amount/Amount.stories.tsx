import preview from '../../../.storybook/preview'
import { StoryMatrix, StoryRow } from '@/dev/StoryMatrix'
import { Amount } from './Amount'

const meta = preview.meta({
  title: 'Components/Amount',
  component: Amount,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A USD amount with tabular digits. At display sizes the "$" renders as an orange glyph; screen readers still hear the value once ("$48,210.50").

USD only: multi-currency is out of scope.

**Do**
- Use \`display\` / \`display-sm\` for KPIs and \`sm\` / \`md\` in tables.
- Use \`compact\` where space is tight ("$14K").
- Set \`glyph={false}\` on the hero gradient, where an orange glyph wouldn't show.

**Don't**
- Don't color negatives red by default; a minus sign (−) already says it. Add color only where loss is the point.`,
      },
    },
  },
  args: { value: 48210.5 },
})

export const Playground = meta.story({
  args: { size: 'display', compact: false },
})

export const AllVariants = meta.story({
  name: 'All variants',
  render: () => (
    <StoryMatrix>
      <div className="flex flex-col gap-3">
        {(['sm', 'md', 'display-sm', 'display'] as const).map((size) => (
          <StoryRow key={size} label={size}>
            <Amount value={48210.5} size={size} />
          </StoryRow>
        ))}
        <StoryRow label="compact">
          <Amount value={14000} compact size="display-sm" />
          <Amount value={1_250_000} compact />
        </StoryRow>
        <StoryRow label="negative">
          <Amount value={-80} size="display-sm" />
          <Amount value={-1234.5} />
        </StoryRow>
        <StoryRow label="glyph on/off">
          <Amount value={980} glyph />
          <Amount value={980} size="display-sm" glyph={false} />
        </StoryRow>
      </div>
    </StoryMatrix>
  ),
})
