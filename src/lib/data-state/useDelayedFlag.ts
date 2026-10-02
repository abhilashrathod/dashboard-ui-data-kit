import { useEffect, useRef, useState } from 'react'

export interface DelayedFlagOptions {
  /** `active` must stay true this long before the flag shows. */
  delay?: number
  /** Once shown, the flag stays on at least this long. */
  minDuration?: number
}

/**
 * Anti-flicker for loading UI. Returns `show`:
 * - it turns true only once `active` has stayed true for `delay` ms, so fast
 *   responses never flash a skeleton or progress bar;
 * - once true, it stays true for at least `minDuration` ms, so a slow-ish
 *   response doesn't show a skeleton for a single frame.
 * Timers are cleared on unmount.
 */
export function useDelayedFlag(
  active: boolean,
  { delay = 150, minDuration = 300 }: DelayedFlagOptions = {},
): boolean {
  const [show, setShow] = useState(false)
  const shownAt = useRef(0)

  useEffect(() => {
    if (active && !show) {
      const timer = setTimeout(() => {
        shownAt.current = Date.now()
        setShow(true)
      }, delay)
      return () => clearTimeout(timer)
    }
    if (!active && show) {
      const remaining = Math.max(0, minDuration - (Date.now() - shownAt.current))
      const timer = setTimeout(() => setShow(false), remaining)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [active, show, delay, minDuration])

  return show
}
