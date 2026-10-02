import type { ReactNode } from 'react'

const COMBOS = [
  { theme: 'light', density: 'comfortable' },
  { theme: 'dark', density: 'comfortable' },
  { theme: 'light', density: 'compact' },
  { theme: 'dark', density: 'compact' },
] as const

/**
 * Dev-only story wrapper: renders its children once per theme × density, so a
 * single "All variants" story shows (and the axe check covers) all four.
 */
export function StoryMatrix({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-grid 2xl:grid-cols-2">
      {COMBOS.map(({ theme, density }) => (
        <div
          key={`${theme}-${density}`}
          data-theme={theme}
          data-density={density}
          className="rounded-lg bg-canvas p-card text-fg"
        >
          <p className="mb-4 text-xs font-medium text-fg-muted">
            {theme} · {density}
          </p>
          {children}
        </div>
      ))}
    </div>
  )
}

/** A labelled row in a variants grid. */
export function StoryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-fg-muted">{label}</span>
      {children}
    </div>
  )
}
