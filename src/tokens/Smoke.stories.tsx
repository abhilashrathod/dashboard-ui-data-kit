import { useQuery } from '@tanstack/react-query'
import { expect } from 'storybook/test'
import preview from '../../.storybook/preview'
import * as z from '@/contracts/zod'
import { apiFetch } from '@/lib/api'

function SurfaceCard() {
  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-md">
      <h2 className="text-base font-semibold text-fg-default">Surface card</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Rendered with semantic token classes only. Flip the theme toolbar to check dark mode.
      </p>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
        <li className="text-accent">accent</li>
        <li className="text-success">success</li>
        <li className="text-warning">warning</li>
        <li className="text-danger">danger</li>
        <li className="text-info">info</li>
      </ul>
      <div className="mt-4 rounded-md bg-muted p-3 text-sm text-fg-muted">bg-muted</div>
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
    <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
      <p className="text-sm text-fg-muted">
        <code>GET /api/health</code>
      </p>
      <p className="mt-1 text-xl font-semibold">
        {health.isPending ? (
          'loading…'
        ) : health.isError ? (
          <span className="text-danger">error</span>
        ) : (
          <span className="text-success">{health.data.ok ? 'ok' : 'not ok'}</span>
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
