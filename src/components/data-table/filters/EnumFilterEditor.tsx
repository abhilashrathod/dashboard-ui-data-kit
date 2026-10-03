import { removeFilter, upsertFilter } from '@/lib/url-state'
import { Checkbox } from '../../checkbox'
import { headingClass, linkButtonClass, type FilterEditorProps } from './editorShared'

/** A checkbox per option. Every toggle applies at once; unchecking the last removes the filter. */
export function EnumFilterEditor({ column, filter, apply, headingId }: FilterEditorProps) {
  if (column.filter.type !== 'enum') return null
  const { field, options } = column.filter
  const selected = new Set(filter?.op === 'in' ? filter.value : [])

  const write = (values: string[]) =>
    apply(
      values.length === 0
        ? removeFilter(field)
        : upsertFilter({ field, op: 'in', value: values }),
    )

  const toggle = (value: string, checked: boolean) => {
    const next = new Set(selected)
    if (checked) next.add(value)
    else next.delete(value)
    // Option order, so the summary reads the same however it was built.
    write(options.map((option) => option.value).filter((v) => next.has(v)))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h3 id={headingId} className={headingClass}>
          {column.label}
        </h3>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={linkButtonClass}
            disabled={selected.size === options.length}
            onClick={() => write(options.map((option) => option.value))}
          >
            Select all
          </button>
          <button
            type="button"
            className={linkButtonClass}
            disabled={selected.size === 0}
            onClick={() => write([])}
          >
            Clear
          </button>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {options.map((option) => (
          <li key={option.value}>
            <Checkbox
              label={option.label}
              checked={selected.has(option.value)}
              onChange={(event) => toggle(option.value, event.currentTarget.checked)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
