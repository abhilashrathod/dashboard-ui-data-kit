import { useSyncExternalStore } from 'react'

export type Density = 'comfortable' | 'compact'

export const DENSITY_STORAGE_KEY = 'dashboard-ui-kit:density'

const listeners = new Set<() => void>()
let density: Density | undefined

function isDensity(value: unknown): value is Density {
  return value === 'comfortable' || value === 'compact'
}

function readStoredDensity(): Density {
  try {
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY)
    return isDensity(stored) ? stored : 'comfortable'
  } catch {
    return 'comfortable'
  }
}

function writeStoredDensity(value: Density): void {
  try {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, value)
  } catch {
    // Storage can be unavailable; the in-memory value still applies.
  }
}

function applyDensity(): void {
  document.documentElement.dataset.density = getDensity()
}

/** The stored density, 'comfortable' by default. */
export function getDensity(): Density {
  density ??= readStoredDensity()
  return density
}

/**
 * Persist a density and apply it to <html data-density>. Any element can also
 * set data-density itself to override it for a subtree.
 */
export function setDensity(next: Density): void {
  density = next
  writeStoredDensity(next)
  applyDensity()
  for (const listener of listeners) listener()
}

/** Apply the stored density. Call once at startup, before rendering. */
export function initDensity(): void {
  applyDensity()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDensity(): { density: Density; setDensity: typeof setDensity } {
  const current = useSyncExternalStore(subscribe, getDensity, () => 'comfortable' as const)
  return { density: current, setDensity }
}
