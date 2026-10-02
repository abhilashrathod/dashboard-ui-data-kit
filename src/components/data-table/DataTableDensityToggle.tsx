import { Rows3, Rows4 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useDensity, type Density } from '@/tokens/density'
import { useDataTableContext } from './context'
import type { ToolbarSlot } from './DataTableToolbar'

const OPTIONS: { value: Density; label: string; Icon: typeof Rows3 }[] = [
  { value: 'comfortable', label: 'Comfortable', Icon: Rows3 },
  { value: 'compact', label: 'Compact', Icon: Rows4 },
]

export interface DataTableDensityToggleProps {
  slot?: ToolbarSlot
  className?: string
}

/**
 * Comfortable / compact, as a segmented pill. Native radios (grouped by name,
 * so arrow keys move between them) inside a labelled radiogroup. Density is a
 * device preference, not list state: it goes through setDensity (localStorage
 * + <html data-density>), never the URL.
 */
export function DataTableDensityToggle({ className }: DataTableDensityToggleProps) {
  const { table } = useDataTableContext('DensityToggle')
  const { density, setDensity } = useDensity()

  return (
    <div
      role="radiogroup"
      aria-label="Row density"
      className={cn(
        'inline-flex h-control-md items-center gap-0.5 rounded-pill bg-surface-subtle p-1',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <label
          key={value}
          data-state={density === value ? 'checked' : 'unchecked'}
          className={cn(
            'relative inline-flex h-full cursor-pointer items-center gap-1.5 rounded-pill px-3 text-sm font-medium text-fg-muted',
            'focus-ring-within transition-colors duration-(--duration-fast) ease-standard',
            'data-[state=checked]:bg-ink data-[state=checked]:text-ink-fg hover-enabled:text-fg',
          )}
        >
          <input
            type="radio"
            name={`${table.id}-density`}
            value={value}
            checked={density === value}
            onChange={() => setDensity(value)}
            className="sr-only"
          />
          <Icon aria-hidden="true" className="size-4 shrink-0" />
          {label}
        </label>
      ))}
    </div>
  )
}
