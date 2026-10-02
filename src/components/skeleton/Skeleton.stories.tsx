import preview from '../../../.storybook/preview'
import { StoryMatrix, StoryRow } from '@/dev/StoryMatrix'
import { Skeleton, SkeletonText } from './Skeleton'

const meta = preview.meta({
  title: 'Components/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A loading placeholder in the shape of the content. Size it with \`className\`. A soft shimmer uses the motion tokens and is off under reduced motion. Always \`aria-hidden\`.

**Do**
- Match the real layout (a KPI skeleton is a short wide bar; a row is a pill).
- Announce loading once on the region (\`aria-busy\`, or a labelled \`Spinner\`).

**Don't**
- Don't show skeletons for under ~300ms; that flashes. Delay them.`,
      },
    },
  },
})

export const Playground = meta.story({ args: { shape: 'rect', className: 'h-4 w-48' } })

export const AllVariants = meta.story({
  name: 'All variants',
  render: () => (
    <StoryMatrix>
      <div className="flex max-w-md flex-col gap-4">
        <StoryRow label="shapes">
          <Skeleton className="h-4 w-24" />
          <Skeleton shape="pill" className="h-control-sm w-24" />
          <Skeleton shape="circle" className="size-control-md" />
        </StoryRow>
        <StoryRow label="KPI card">
          <div className="flex flex-1 flex-col gap-3 rounded-lg bg-surface p-card">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-40" />
            <Skeleton shape="tile" className="h-12 w-full" />
          </div>
        </StoryRow>
        <StoryRow label="text">
          <SkeletonText lines={3} className="flex-1" />
        </StoryRow>
      </div>
    </StoryMatrix>
  ),
})
