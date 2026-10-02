import { useQuery } from '@tanstack/react-query'
import { expect } from 'storybook/test'
import preview from '../../.storybook/preview'
import { z } from '@/contracts/zod'
import { apiFetch } from '@/lib/api'

const STATUSES = ['success', 'warning', 'danger', 'info', 'neutral'] as const

// Literal class names, so Tailwind's scanner sees every one.
const STATUS_PILL: Record<(typeof STATUSES)[number], string> = {
  success: 'bg-status-success-subtle text-status-success-fg',
  warning: 'bg-status-warning-subtle text-status-warning-fg',
  danger: 'bg-status-danger-subtle text-status-danger-fg',
  info: 'bg-status-info-subtle text-status-info-fg',
  neutral: 'bg-status-neutral-subtle text-status-neutral-fg',
}

function SurfaceCard() {
  return (
    <div className="rounded-lg bg-surface p-card">
      <h2 className="text-md font-semibold text-fg">Surface card</h2>
      <p className="mt-1 text-fg-muted">
        Rendered with semantic token classes only. Flip the theme and density toolbars to check
        both.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2 text-sm font-medium">
        <li className="rounded-pill bg-accent-subtle px-3 py-1 text-accent-subtle-fg">accent</li>
        {STATUSES.map((status) => (
          <li key={status} className={`rounded-pill px-3 py-1 ${STATUS_PILL[status]}`}>
            {status}
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-md bg-surface-subtle p-tile text-fg-muted">
        bg-surface-subtle
      </div>
    </div>
  )
}

const Health = z.object({ ok: z.boolean() })

function HealthProbe() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => apiFetch('/api/health', { schema: Health, signal }),
  })

  return (
    <div className="rounded-lg bg-surface p-card">
      <p className="text-fg-muted">
        <code>GET /api/health</code>
      </p>
      <p className="mt-1 text-xl font-semibold">
        {health.isPending ? (
          'loading…'
        ) : health.isError ? (
          <span className="text-status-danger-fg">error</span>
        ) : (
          <span className="text-status-success-fg">{health.data.ok ? 'ok' : 'not ok'}</span>
        )}
      </p>
    </div>
  )
}

const meta = preview.meta({
  title: 'Foundations/Smoke',
})

export const Smoke = meta.story({
  render: () => (
    <div className="grid max-w-md gap-4">
      <SurfaceCard />
      <HealthProbe />
    </div>
  ),
  play: async ({ canvas }) => {
    // Proves MSW (browser worker) → fetch → TanStack Query → render.
    await expect(await canvas.findByText('ok')).toBeVisible()
  },
})
