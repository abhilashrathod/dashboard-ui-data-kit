import { formatPercent } from '@/lib/format'

export type DeltaDirection = 'up' | 'down' | 'flat' | 'new'
export type DeltaTone = 'success' | 'danger' | 'neutral'

export interface Delta {
  direction: DeltaDirection
  /** Relative change as a fraction (0.07 = 7%); null when previous is 0. */
  change: number | null
  tone: DeltaTone
  /** Visible text: "7%", "12.4%", "0%" or "New". */
  text: string
  /** Full sentence for screen readers, e.g. "Increased 7% vs last 30 days". */
  sentence: string
}

/** Changes that round to 0.0% are shown (and toned) as unchanged. */
const FLAT_THRESHOLD = 0.0005

/**
 * Percent change from `previous` to `current`.
 *
 * - The denominator is |previous|, so going from −100 to −50 is +50%.
 * - previous = 0 and current ≠ 0 has no finite percent change: it shows "New",
 *   with a neutral tone (never "Infinity%").
 * - Neutral tone when unchanged (or new); otherwise success when the change is
 *   in the `goodWhen` direction, danger when it isn't.
 */
export function computeDelta(
  current: number,
  previous: number,
  goodWhen: 'up' | 'down',
  periodLabel?: string,
): Delta {
  const period = periodLabel ? ` ${periodLabel}` : ''

  if (previous === 0) {
    if (current === 0) {
      return {
        direction: 'flat',
        change: 0,
        tone: 'neutral',
        text: '0%',
        sentence: `Unchanged${period}`,
      }
    }
    return {
      direction: 'new',
      change: null,
      tone: 'neutral',
      text: 'New',
      sentence: `New, up from 0${period}`,
    }
  }

  const change = (current - previous) / Math.abs(previous)
  if (Math.abs(change) < FLAT_THRESHOLD) {
    return {
      direction: 'flat',
      change: 0,
      tone: 'neutral',
      text: '0%',
      sentence: `Unchanged${period}`,
    }
  }

  const direction = change > 0 ? 'up' : 'down'
  const text = formatPercent(Math.abs(change), { digits: 1 })
  return {
    direction,
    change,
    tone: direction === goodWhen ? 'success' : 'danger',
    text,
    sentence: `${direction === 'up' ? 'Increased' : 'Decreased'} ${text}${period}`,
  }
}
