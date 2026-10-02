import { ApiError, type ApiErrorCode } from '@/lib/api'
import type { DataState, DataStatus } from '@/lib/data-state'
import { formatNumber } from '@/lib/format'
import preview from '../../../.storybook/preview'
import { Card } from '../card'
import { DeltaChip } from '../delta-chip'
import { Skeleton } from '../skeleton'
import { DataBoundary } from './DataBoundary'
import { ERROR_COPY } from './ErrorState'

const ERROR_CODES = Object.keys(ERROR_COPY) as ApiErrorCode[]

interface StaticArgs {
  status: DataStatus
  code?: ApiErrorCode
  refetching?: boolean
  placeholder?: boolean
  stale?: boolean
}

/** Hand-built, deterministic DataStates: no network involved. */
function buildState({ status, code = 'SERVER_ERROR', refetching, placeholder, stale }: StaticArgs) {
  const retry = () => new Promise((resolve) => setTimeout(resolve, 800))
  const error = new ApiError({ status: 500, code, message: 'Simulated', requestId: 'req_000123' })
  const states: Record<DataStatus, DataState<{ total: number; previous: number }>> = {
    loading: { status: 'loading' },
    empty: { status: 'empty' },
    'no-results': { status: 'no-results', clear: () => {} },
    error: { status: 'error', error, retry },
    ready: {
      status: 'ready',
      data: { total: 1284, previous: 1142 },
      isRefetching: refetching ?? false,
      isPlaceholder: placeholder ?? false,
      staleError: stale ? error : undefined,
      updatedAt: Date.now() - 2 * 60_000,
      retry,
    },
  }
  return states[status]
}

/** One boundary at each size: a default card and a compact KPI-sized card. */
function StaticDemo(args: StaticArgs & { suffix?: string }) {
  const state = buildState(args)
  const suffix = args.suffix ?? ''
  return (
    <div className="grid max-w-4xl gap-grid md:grid-cols-[2fr_1fr]">
      <Card>
        <Card.Title className="text-sm font-medium text-fg-muted">Orders (default size)</Card.Title>
        <DataBoundary
          state={state}
          label={`Orders${suffix}`}
          skeleton={<Skeleton className="h-10 w-36" />}
        >
          {({ total }) => <p className="text-display-sm tabular">{formatNumber(total)}</p>}
        </DataBoundary>
      </Card>
      <Card>
        <Card.Title className="text-sm font-medium text-fg-muted">Orders (compact)</Card.Title>
        <DataBoundary
          state={state}
          label={`Order count${suffix}`}
          size="compact"
          skeleton={<Skeleton className="h-8 w-28" />}
        >
          {({ total, previous }) => (
            <div className="flex items-center gap-2">
              <span className="text-2xl tabular">{formatNumber(total)}</span>
              <DeltaChip current={total} previous={previous} goodWhen="up" />
            </div>
          )}
        </DataBoundary>
      </Card>
    </div>
  )
}

const meta = preview.meta({
  title: 'Data/DataBoundary',
  component: StaticDemo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Renders a \`DataState\` (see docs/data-states.md): the skeleton (after 150ms, for at least 300ms), the empty / no-results / error UIs, or your render function with the data. While ready it adds a refetch bar, a stale banner, and dimming for placeholder data.

The region (\`<section aria-label>\`) owns \`aria-busy\`, announces transitions politely ("Orders failed to load", "Orders loaded", "Orders couldn't refresh"), and moves focus to itself when a focused Retry button disappears.

These stories use hand-built states (no network). See **Data/States in practice** for real queries.

**Do**
- Make the skeleton mirror the final layout.
- Use \`size="compact"\` in KPI cards and small widgets.

**Don't**
- Don't render your own spinners or error copy inside \`children\`; the boundary owns those states.`,
      },
    },
  },
  argTypes: {
    status: { control: 'select', options: ['loading', 'empty', 'no-results', 'error', 'ready'] },
    code: { control: 'select', options: ERROR_CODES },
  },
})

export const Loading = meta.story({ args: { status: 'loading' } })
export const Empty = meta.story({ args: { status: 'empty' } })
export const NoResults = meta.story({ args: { status: 'no-results' } })

/** Pick the ApiError code with the control: the copy comes from ERROR_COPY. */
export const ErrorStory = meta.story({
  name: 'Error',
  args: { status: 'error', code: 'SERVER_ERROR' },
})

export const Ready = meta.story({ args: { status: 'ready' } })
export const ReadyRefetching = meta.story({
  name: 'Ready + Refetching',
  args: { status: 'ready', refetching: true },
})
export const ReadyPlaceholder = meta.story({
  name: 'Ready + Placeholder',
  args: { status: 'ready', refetching: true, placeholder: true },
})
export const ReadyStaleError = meta.story({
  name: 'Ready + StaleError',
  args: { status: 'ready', stale: true },
})

const GALLERY: (StaticArgs & { name: string })[] = [
  { name: 'loading', status: 'loading' },
  { name: 'empty', status: 'empty' },
  { name: 'no results', status: 'no-results' },
  ...ERROR_CODES.map((code) => ({ name: `error ${code}`, status: 'error' as const, code })),
  { name: 'ready', status: 'ready' },
  { name: 'refetching', status: 'ready', refetching: true },
  { name: 'placeholder', status: 'ready', placeholder: true },
  { name: 'stale', status: 'ready', stale: true },
]

function Gallery() {
  return (
    <div className="flex flex-col gap-6">
      {GALLERY.map(({ name, ...args }) => (
        <div key={name} className="flex flex-col gap-2">
          <p className="text-xs font-medium text-fg-muted">{name}</p>
          <StaticDemo {...args} suffix={` (${name})`} />
        </div>
      ))}
    </div>
  )
}

/** Every state and error code at both sizes, for the a11y scan in dark + compact. */
export const AllStatesDarkCompact = meta.story({
  tags: ['!autodocs'],
  globals: { theme: 'dark', density: 'compact' },
  args: { status: 'ready' },
  render: () => <Gallery />,
})

export const AllStatesLight = meta.story({
  tags: ['!autodocs'],
  args: { status: 'ready' },
  render: () => <Gallery />,
})
