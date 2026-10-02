import { cn } from '@/lib/cn'
import { useDelayedFlag } from '@/lib/data-state'

/**
 * A 2px indeterminate bar along the top edge of the nearest positioned
 * ancestor, while a background refetch runs. Delayed (useDelayedFlag), so fast
 * refetches don't flash. aria-hidden: the boundary sets aria-busy.
 * Under reduced motion the bar is full width and pulses instead of sweeping.
 */
export function RefetchIndicator({ active, className }: { active: boolean; className?: string }) {
  const show = useDelayedFlag(active)
  if (!show) return null
  return (
    <div
      aria-hidden="true"
      data-slot="refetch-indicator"
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden',
        className,
      )}
    >
      <div className="h-full w-1/3 animate-indeterminate bg-accent motion-reduce:w-full motion-reduce:animate-pulse" />
    </div>
  )
}
