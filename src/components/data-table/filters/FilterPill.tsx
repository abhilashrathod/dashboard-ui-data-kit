import { ChevronDown, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import type { ListParams } from '@/contracts'
import { cn } from '@/lib/cn'
import { removeFilter } from '@/lib/url-state'
import { buttonVariants } from '../../button'
import { Popover, PopoverContent, PopoverTrigger } from '../../popover'
import { DateFilterEditor } from './DateFilterEditor'
import { EnumFilterEditor } from './EnumFilterEditor'
import { activeFilter, filterSummary, type FilterableColumn } from './filterModel'
import { NumberFilterEditor } from './NumberFilterEditor'

const EDITORS = {
  enum: EnumFilterEditor,
  number: NumberFilterEditor,
  date: DateFilterEditor,
} as const

export interface FilterPillProps {
  column: FilterableColumn
  params: ListParams
  apply: (updater: (prev: ListParams) => ListParams) => void
}

/**
 * One column's filter: an outline pill ("Status ⌄") when inactive; when
 * active, an accent-subtle pill with the summary and a separate × to remove.
 * The trigger is the same element in both states (only its classes change),
 * so focus stays on it when a toggle in the editor activates the filter.
 */
export function FilterPill({ column, params, apply }: FilterPillProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const headingId = useId()
  const { field } = column.filter
  const filter = activeFilter(params, field)
  const active = filter !== undefined
  const Editor = EDITORS[column.filter.type]

  const remove = () => {
    apply(removeFilter(field))
    // The × is about to unmount: keep focus on this pill instead of <body>.
    triggerRef.current?.focus()
  }

  return (
    <div
      data-active={active ? '' : undefined}
      className={cn(
        'inline-flex max-w-full items-center rounded-pill',
        active && 'bg-accent-subtle text-accent-subtle-fg',
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            className={cn(
              buttonVariants({ variant: active ? 'ghost' : 'outline', size: 'sm' }),
              'min-w-0',
              active && 'pr-1 text-accent-subtle-fg',
            )}
          >
            <span className="truncate">{filter ? filterSummary(column, filter) : column.label}</span>
            {active ? null : <ChevronDown aria-hidden="true" />}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" aria-labelledby={headingId} className="w-72">
          <Editor
            column={column}
            filter={filter}
            apply={apply}
            close={() => setOpen(false)}
            headingId={headingId}
          />
        </PopoverContent>
      </Popover>
      {active ? (
        <button
          type="button"
          aria-label={`Remove ${column.label} filter`}
          onClick={remove}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'size-control-sm px-0 text-accent-subtle-fg',
          )}
        >
          <X aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
