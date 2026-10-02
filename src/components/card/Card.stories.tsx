import { Download, MoreHorizontal } from 'lucide-react'
import preview from '../../../.storybook/preview'
import { StoryMatrix } from '@/dev/StoryMatrix'
import { Amount } from '../amount'
import { Button } from '../button'
import { DeltaChip } from '../delta-chip'
import { IconButton } from '../icon-button'
import { Card } from './Card'

const meta = preview.meta({
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `The container. Depth comes from tone, not borders or shadows: a white card on the canvas, a subtle tile inside a card.

Parts: \`Card.Header\` (title and an \`actions\` slot), \`Card.Title\` (\`as\` h2–h4, default h3), \`Card.Description\`, \`Card.Body\`.

**Do**
- Use **at most one \`hero\` per screen**, for the most important number.
- Use \`tile\` for groups nested inside a card.
- Pick the title's heading level (\`as\`) to fit the page outline.

**Don't**
- Don't put small text directly on the hero: titles and descriptions there automatically render as surface pills, because white on the gradient is only 3:1 (large text only).
- Don't nest a default card inside another card; use \`tile\`.`,
      },
    },
  },
})

export const Playground = meta.story({
  args: { variant: 'default' },
  render: (args) => (
    <Card {...args} className="max-w-md">
      <Card.Header>
        <Card.Title>Orders</Card.Title>
        <Card.Description>Last 30 days</Card.Description>
      </Card.Header>
      <Card.Body>Body content</Card.Body>
    </Card>
  ),
})

export const AllVariants = meta.story({
  name: 'All variants',
  render: () => (
    <StoryMatrix>
      <div className="grid gap-grid lg:grid-cols-2">
        <Card variant="hero">
          <Card.Header>
            <Card.Title>Revenue · This month</Card.Title>
          </Card.Header>
          <Amount value={48210.5} size="display" glyph={false} />
        </Card>

        <Card>
          <Card.Header
            actions={
              <IconButton variant="ghost" size="sm" aria-label="More options">
                <MoreHorizontal />
              </IconButton>
            }
          >
            <Card.Title>Orders</Card.Title>
            <Card.Description>Last 30 days</Card.Description>
          </Card.Header>
          <div className="flex items-end gap-3">
            <span className="text-display-sm tabular">1,284</span>
            <DeltaChip current={1284} previous={1142} goodWhen="up" periodLabel="vs last 30 days" />
          </div>
          <Card variant="tile" className="flex-row items-center justify-between">
            <span className="text-fg-muted">Refund rate</span>
            <DeltaChip current={2.5} previous={2.1} goodWhen="down" periodLabel="vs last 30 days" />
          </Card>
        </Card>

        <Card className="lg:col-span-2">
          <Card.Header actions={<Button leftIcon={<Download />}>Export</Button>}>
            <Card.Title as="h2" className="text-xl">
              Overview
            </Card.Title>
            <Card.Description>A default card with a header action.</Card.Description>
          </Card.Header>
          <Card.Body>
            <Card variant="tile">
              <Card.Title>Nested tile</Card.Title>
              <Card.Description>surface-subtle, radius-md, space-tile.</Card.Description>
            </Card>
          </Card.Body>
        </Card>
      </div>
    </StoryMatrix>
  ),
})
