import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(listener: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

/**
 * True under `prefers-reduced-motion: reduce`. CSS animations already drop to
 * 0ms through the motion tokens; this is for JS-driven motion (Recharts).
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}
