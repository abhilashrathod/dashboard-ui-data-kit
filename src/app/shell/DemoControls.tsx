import { useQueryClient } from '@tanstack/react-query'
import { FlaskConical, RotateCcw } from 'lucide-react'
import { useId, useState } from 'react'
import {
  Button,
  Checkbox,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useToast,
  VisuallyHidden,
} from '@/components'
import { cn } from '@/lib/cn'
import {
  mockNetwork,
  NORMAL_STATE,
  type DemoNetworkState,
  type EndpointKey,
  type NetworkMode,
} from './mockNetwork'

const MODES: readonly { value: NetworkMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'slow', label: 'Slow' },
  { value: 'flaky', label: 'Flaky' },
  { value: 'error', label: 'Error' },
  { value: 'empty', label: 'Empty' },
]

const ENDPOINTS: readonly { value: EndpointKey; label: string }[] = [
  { value: 'metrics.kpis', label: 'KPIs' },
  { value: 'metrics.revenue', label: 'Revenue chart' },
  { value: 'metrics.statusBreakdown', label: 'Status breakdown' },
  { value: 'orders.list', label: 'Orders list' },
]

const modeLabel = (mode: NetworkMode) => MODES.find((m) => m.value === mode)?.label ?? mode
const isSimulating = (state: DemoNetworkState) =>
  state.mode !== 'normal' || state.failEndpoints.length > 0

/**
 * Simulated API conditions, for showing off loading, error and empty states.
 * Renders nothing when the mock worker isn't running.
 */
export function DemoControls() {
  if (!mockNetwork.available()) return null
  return <DemoControlsPopover />
}

function DemoControlsPopover() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  // Seeded from the mock layer, so ?network= / ?fail= on load show up here.
  const [state, setState] = useState<DemoNetworkState>(() => mockNetwork.read())
  const ids = { mode: useId(), endpoints: useId() }

  /** Apply, then reset every query so the new conditions show immediately. */
  const apply = (next: DemoNetworkState, message: string) => {
    setState(next)
    void queryClient.resetQueries()
    toast({ title: message })
  }

  const setMode = (mode: NetworkMode) => {
    mockNetwork.write({ mode })
    apply({ ...state, mode }, `Network: ${modeLabel(mode)}`)
  }

  const toggleEndpoint = (endpoint: EndpointKey, broken: boolean) => {
    const failEndpoints = broken
      ? [...state.failEndpoints, endpoint]
      : state.failEndpoints.filter((key) => key !== endpoint)
    mockNetwork.write({ failEndpoints })
    const label = ENDPOINTS.find((e) => e.value === endpoint)?.label ?? endpoint
    apply({ ...state, failEndpoints }, `${label}: ${broken ? 'broken' : 'restored'}`)
  }

  const reset = () => {
    mockNetwork.reset()
    apply(NORMAL_STATE, 'Demo data and network reset')
  }

  const active = isSimulating(state)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" leftIcon={<FlaskConical />} className="relative">
          Demo
          {active ? (
            <>
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-2 size-2 rounded-pill bg-accent ring-2 ring-surface-muted"
              />
              <VisuallyHidden> (simulation active)</VisuallyHidden>
            </>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-5">
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Demo controls</p>
          <p className="text-sm text-fg-muted">
            Simulate API conditions to see loading, error and empty states.
          </p>
        </div>

        <div role="radiogroup" aria-labelledby={ids.mode} className="flex flex-col gap-2">
          <p id={ids.mode} className="text-sm font-medium">
            Network
          </p>
          <div className="flex flex-wrap gap-0.5 rounded-lg bg-surface-muted p-1">
            {MODES.map(({ value, label }) => (
              <label
                key={value}
                className={cn(
                  'flex h-control-sm flex-1 cursor-pointer items-center justify-center rounded-pill px-1.5 text-sm font-medium focus-ring-within',
                  'transition-colors duration-(--duration-fast) ease-standard',
                  'text-fg-muted hover:text-fg has-checked:bg-surface has-checked:text-fg',
                )}
              >
                <input
                  type="radio"
                  name={ids.mode}
                  value={value}
                  checked={state.mode === value}
                  onChange={() => setMode(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend id={ids.endpoints} className="mb-2 text-sm font-medium">
            Break individual endpoints
          </legend>
          {ENDPOINTS.map(({ value, label }) => (
            <Checkbox
              key={value}
              label={label}
              checked={state.failEndpoints.includes(value)}
              onChange={(event) => toggleEndpoint(value, event.currentTarget.checked)}
            />
          ))}
        </fieldset>

        <Button variant="outline" size="sm" leftIcon={<RotateCcw />} onClick={reset} className="self-start">
          Reset data
        </Button>
      </PopoverContent>
    </Popover>
  )
}
