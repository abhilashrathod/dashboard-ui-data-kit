import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { getJson } from '@/lib/api'

interface Health {
  ok: boolean
}

export function HealthCard() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => getJson<Health>('/api/health'),
  })

  let status: ReactNode
  if (health.isPending) {
    status = <span className="text-fg-muted">checking…</span>
  } else if (health.isError) {
    status = <span className="text-danger">unavailable</span>
  } else {
    status = health.data.ok ? (
      <span className="text-success">ok</span>
    ) : (
      <span className="text-warning">degraded</span>
    )
  }

  return (
    <section
      aria-labelledby="health-title"
      className="rounded-lg border border-border bg-surface p-6 shadow-sm"
    >
      <h2 id="health-title" className="text-sm font-medium text-fg-muted">
        API health
      </h2>
      <p className="mt-2 text-2xl font-semibold" aria-live="polite">
        {status}
      </p>
      <p className="mt-1 text-sm text-fg-muted">
        <code>GET /api/health</code> via TanStack Query, served by MSW.
      </p>
    </section>
  )
}
