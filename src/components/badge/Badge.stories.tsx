import preview from '../../../.storybook/preview'
import { StoryMatrix, StoryRow } from '@/dev/StoryMatrix'
import { Badge, type BadgeTone } from './Badge'

const TONES: BadgeTone[] = ['neutral', 'success', 'warning', 'danger', 'info', 'accent']

const meta = preview.meta({
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A small pill label with a tone. Every tone passes 4.5:1 for its text in both variants and both themes.

**Do**
- Make the text carry the meaning ("Overdue"), with the tone reinforcing it.
- Use \`dot\` for states (as \`StatusPill\` does), and \`outline\` for quieter metadata.

**Don't**
- Don't use a Badge as a button; it isn't interactive.
- Don't rely on tone alone; "danger" with the text "3" means nothing to a screen reader user.`,
      },
    },
  },
  args: { children: 'Label' },
})

export const Playground = meta.story({
  args: { tone: 'accent', variant: 'subtle', dot: false },
})

export const AllVariants = meta.story({
  name: 'All variants',
  render: () => (
    <StoryMatrix>
      <div className="flex flex-col gap-3">
        {(['subtle', 'outline'] as const).map((variant) => (
          <StoryRow key={variant} label={variant}>
            {TONES.map((tone) => (
              <Badge key={tone} tone={tone} variant={variant}>
                {tone}
              </Badge>
            ))}
          </StoryRow>
        ))}
        <StoryRow label="with dot">
          {TONES.map((tone) => (
            <Badge key={tone} tone={tone} dot>
              {tone}
            </Badge>
          ))}
        </StoryRow>
      </div>
    </StoryMatrix>
  ),
})
