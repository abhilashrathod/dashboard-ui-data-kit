import type { ReactNode } from 'react'
import { expect } from 'storybook/test'
import preview from '../../.storybook/preview'
import { HatchPattern } from '@/tokens/patterns'

/*
 * Foundations/Look & Feel: one static mock of the visual language, as a
 * reference for later stages. NOT kit code: nothing here is exported or reused,
 * and the "components" are deliberately inline.
 */

const pill =
  'inline-flex h-control-md items-center gap-2 rounded-pill px-4 font-medium transition-colors duration-(--duration-fast) ease-standard focus-ring'

function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-4 fill-none stroke-current"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  )
}

const ICON = {
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  download: 'M12 3v12m0 0-4-4m4 4 4-4M5 21h14',
  up: 'm6 14 6-6 6 6',
  down: 'm6 10 6 6 6-6',
}

function Delta({ tone, children }: { tone: 'up' | 'down'; children: ReactNode }) {
  return (
    <span
      className={
        tone === 'up'
          ? 'inline-flex items-center gap-1 rounded-pill bg-status-success-subtle px-2 py-0.5 text-sm font-medium text-status-success-fg tabular'
          : 'inline-flex items-center gap-1 rounded-pill bg-status-danger-subtle px-2 py-0.5 text-sm font-medium text-status-danger-fg tabular'
      }
    >
      <Icon path={tone === 'up' ? ICON.up : ICON.down} />
      {children}
    </span>
  )
}

const STATUS = [
  {
    label: 'Paid',
    pill: 'bg-status-success-subtle text-status-success-fg',
    dot: 'bg-status-success',
  },
  {
    label: 'Pending',
    pill: 'bg-status-warning-subtle text-status-warning-fg',
    dot: 'bg-status-warning',
  },
  {
    label: 'Refunded',
    pill: 'bg-status-danger-subtle text-status-danger-fg',
    dot: 'bg-status-danger',
  },
]

const CHANNELS = [
  { label: 'Web', current: 82, previous: 64 },
  { label: 'Mobile', current: 58, previous: 71 },
  { label: 'Retail', current: 40, previous: 33 },
  { label: 'Partner', current: 24, previous: 18 },
]

function HeroKpi() {
  return (
    <section
      aria-labelledby="lf-hero"
      className="flex flex-col justify-between gap-8 rounded-lg bg-gradient-accent p-card text-accent-gradient-fg"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Small text never sits on the gradient directly (white is 3.77:1 there): it gets a surface pill. */}
        <h2 id="lf-hero" className="rounded-pill bg-surface px-3 py-1 text-sm font-medium text-fg">
          Revenue · This month
        </h2>
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-pill bg-surface text-2xl text-accent"
        >
          $
        </span>
      </div>
      <p className="text-display tabular">
        <span className="sr-only">$</span>48,210<span className="text-2xl">.50</span>
      </p>
    </section>
  )
}

function Kpi() {
  return (
    <section
      aria-labelledby="lf-orders"
      className="flex flex-col gap-4 rounded-lg bg-surface p-card"
    >
      <h2 id="lf-orders" className="font-medium text-fg-muted">
        Orders
      </h2>
      <div className="flex items-end gap-3">
        <p className="text-display-sm tabular">1,284</p>
        <Delta tone="up">12.4%</Delta>
      </div>
      <div className="flex items-center justify-between rounded-md bg-surface-subtle p-tile">
        <span className="text-fg-muted">Refund rate</span>
        <span className="flex items-center gap-2">
          <span className="font-medium tabular">2.1%</span>
          <Delta tone="down">0.4 pt</Delta>
        </span>
      </div>
    </section>
  )
}

function ChannelChart() {
  const height = 120
  const barWidth = 20
  const group = 72
  return (
    // On surface, not in a subtle tile: chart colors are contrast-tested against surface.
    <figure>
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">Sales by channel</span>
        <span className="flex items-center gap-4 text-sm text-fg-muted">
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-xs bg-chart-1" /> This period
          </span>
          <span className="flex items-center gap-2">
            <svg className="size-3 rounded-xs" aria-hidden="true">
              <defs>
                <HatchPattern id="lf-hatch-legend" size={4} strokeWidth={1.5} />
              </defs>
              <rect width="100%" height="100%" fill="url(#lf-hatch-legend)" />
            </svg>
            Previous period
          </span>
        </span>
      </figcaption>
      <svg
        role="img"
        aria-label="Sales by channel, this period vs previous: Web 82 vs 64, Mobile 58 vs 71, Retail 40 vs 33, Partner 24 vs 18."
        viewBox={`0 0 ${CHANNELS.length * group} ${height + 20}`}
        width={CHANNELS.length * group}
        height={height + 20}
        className="mt-4 max-w-full"
      >
        <defs>
          <HatchPattern id="lf-hatch" />
        </defs>
        <line
          x1={0}
          x2={CHANNELS.length * group}
          y1={height}
          y2={height}
          className="stroke-chart-grid"
        />
        {CHANNELS.map((channel, index) => {
          const x = index * group + 12
          return (
            <g key={channel.label}>
              <rect
                x={x}
                y={height - channel.current}
                width={barWidth}
                height={channel.current}
                rx={6}
                className="fill-chart-1"
              />
              <rect
                x={x + barWidth + 4}
                y={height - channel.previous}
                width={barWidth}
                height={channel.previous}
                rx={6}
                fill="url(#lf-hatch)"
                style={{ stroke: 'var(--color-chart-hatch-fg)', strokeWidth: 1 }}
              />
              <text
                x={x + barWidth + 2}
                y={height + 16}
                textAnchor="middle"
                className="fill-fg-muted text-xs"
              >
                {channel.label}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

function MainCard() {
  return (
    <section
      aria-labelledby="lf-main"
      className="flex flex-col gap-card rounded-lg bg-surface p-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="lf-main" className="text-xl font-semibold">
            Overview
          </h2>
          <p className="text-fg-muted">
            Last 30 days ·{' '}
            <a
              href="#lf-main"
              className="rounded-xs font-medium text-accent-text underline-offset-2 focus-ring hover:underline"
            >
              View report
            </a>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="grid size-control-md place-items-center rounded-pill bg-surface-muted text-fg focus-ring"
          >
            <Icon path={ICON.bell} />
          </button>
          <button
            type="button"
            className={`${pill} border border-border-strong text-fg hover:bg-surface-subtle`}
          >
            Filters
          </button>
          <button type="button" className={`${pill} bg-surface-muted text-fg`}>
            Share
          </button>
          <button type="button" className={`${pill} bg-ink text-ink-fg hover:bg-ink-hover`}>
            <Icon path={ICON.download} />
            Export
          </button>
        </div>
      </div>

      <ul className="flex flex-wrap gap-2" aria-label="Order statuses">
        {STATUS.map((status) => (
          <li
            key={status.label}
            className={`inline-flex items-center gap-2 rounded-pill px-3 py-1 text-sm font-medium ${status.pill}`}
          >
            <span aria-hidden="true" className={`size-2 rounded-pill ${status.dot}`} />
            {status.label}
          </li>
        ))}
      </ul>

      <ChannelChart />
    </section>
  )
}

function LookAndFeel() {
  return (
    <div className="mx-auto grid max-w-5xl gap-grid md:grid-cols-[1fr_1fr]">
      <HeroKpi />
      <Kpi />
      <div className="md:col-span-2">
        <MainCard />
      </div>
    </div>
  )
}

const meta = preview.meta({
  title: 'Foundations/Look & Feel',
  component: LookAndFeel,
})

export const LookAndFeelStory = meta.story({
  name: 'Look & Feel',
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Export' })).toBeVisible()
    await expect(canvas.getByRole('img', { name: /Sales by channel/ })).toBeVisible()
  },
})

/** Same mock in dark mode, so the a11y check covers both themes in CI. */
export const Dark = meta.story({ globals: { theme: 'dark' } })

export const CompactDark = meta.story({ globals: { theme: 'dark', density: 'compact' } })
