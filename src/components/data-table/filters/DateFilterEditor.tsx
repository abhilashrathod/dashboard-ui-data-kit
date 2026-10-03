import { Check } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { cn } from '@/lib/cn'
import { upsertFilter } from '@/lib/url-state'
import { Button } from '../../button'
import { Input } from '../../input'
import { errorClass, headingClass, type FilterEditorProps } from './editorShared'
import { DATE_PRESETS, datePresetRange, matchDatePreset } from './filterModel'

/**
 * Presets that apply at once (computed from the local today), and a custom
 * range of two native date inputs with Apply. Both ends are inclusive.
 */
export function DateFilterEditor({ column, filter, apply, close, headingId }: FilterEditorProps) {
  const ids = { from: useId(), to: useId(), error: useId(), custom: useId() }
  const current = filter?.field === 'createdAt' ? filter.value : undefined
  const activePreset = current ? matchDatePreset(current) : undefined
  const [from, setFrom] = useState(current?.[0] ?? '')
  const [to, setTo] = useState(current?.[1] ?? '')
  const [submitted, setSubmitted] = useState(false)

  if (column.filter.type !== 'date') return null
  const { field } = column.filter

  const error = !from || !to ? 'Choose both dates' : from > to ? 'Start must be on or before end' : undefined
  const shownError = submitted ? error : undefined

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (error) return
    apply(upsertFilter({ field, op: 'between', value: [from, to] }))
    close()
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 id={headingId} className={headingClass}>
        {column.label}
      </h3>
      <ul className="flex flex-col gap-0.5">
        {DATE_PRESETS.map((preset) => {
          const active = activePreset?.id === preset.id
          return (
            <li key={preset.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => {
                  apply(upsertFilter({ field, op: 'between', value: datePresetRange(preset.id) }))
                  close()
                }}
                className={cn(
                  'flex h-control-sm w-full items-center justify-between gap-3 rounded-pill px-3 text-left text-sm focus-ring',
                  'transition-colors duration-(--duration-fast) ease-standard',
                  active
                    ? 'bg-accent-subtle font-medium text-accent-subtle-fg'
                    : 'hover-enabled:bg-surface-muted',
                )}
              >
                {preset.label}
                {active ? <Check aria-hidden="true" className="size-4" /> : null}
              </button>
            </li>
          )
        })}
      </ul>
      <form
        noValidate
        onSubmit={onSubmit}
        aria-labelledby={ids.custom}
        className="flex flex-col gap-2 border-t border-border pt-3"
      >
        <p id={ids.custom} className="text-sm font-medium">
          Custom range
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor={ids.from} className="text-xs text-fg-muted">
              From
            </label>
            <Input
              id={ids.from}
              size="sm"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.currentTarget.value)}
              invalid={!!shownError && (!from || from > to)}
              aria-describedby={shownError ? ids.error : undefined}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor={ids.to} className="text-xs text-fg-muted">
              To
            </label>
            <Input
              id={ids.to}
              size="sm"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.currentTarget.value)}
              invalid={!!shownError && (!to || from > to)}
              aria-describedby={shownError ? ids.error : undefined}
            />
          </div>
        </div>
        {shownError ? (
          <p id={ids.error} className={errorClass}>
            {shownError}
          </p>
        ) : null}
        <Button type="submit" size="sm" className="self-end">
          Apply
        </Button>
      </form>
    </div>
  )
}
