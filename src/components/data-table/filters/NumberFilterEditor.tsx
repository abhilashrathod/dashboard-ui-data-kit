import { useId, useState, type FormEvent } from 'react'
import { upsertFilter } from '@/lib/url-state'
import { Button } from '../../button'
import { Input } from '../../input'
import { Select } from '../../select'
import { errorClass, headingClass, type FilterEditorProps } from './editorShared'

type Op = 'gt' | 'lt' | 'between'

const OPS = [
  { value: 'gt', label: 'is above' },
  { value: 'lt', label: 'is below' },
  { value: 'between', label: 'is between' },
]

const isOp = (value: string): value is Op => value === 'gt' || value === 'lt' || value === 'between'

/** "" → required; otherwise a finite, non-negative number. */
function check(raw: string): { value?: number; error?: string } {
  if (raw.trim() === '') return { error: 'Enter an amount' }
  const value = Number(raw)
  if (!Number.isFinite(value)) return { error: 'Enter a number' }
  if (value < 0) return { error: "Can't be negative" }
  return { value }
}

/**
 * Operator + one or two amounts, applied with the button or Enter. The draft
 * is local until then; the editor remounts on every open, so it always starts
 * from the URL's filter.
 */
export function NumberFilterEditor({ column, filter, apply, close, headingId }: FilterEditorProps) {
  const ids = { op: useId(), min: useId(), max: useId(), error: useId() }
  const current = filter?.field === 'amount' ? filter : undefined
  const [op, setOp] = useState<Op>(current?.op ?? 'gt')
  const [min, setMin] = useState(
    current ? String(current.op === 'between' ? current.value[0] : current.value) : '',
  )
  const [max, setMax] = useState(current?.op === 'between' ? String(current.value[1]) : '')
  const [submitted, setSubmitted] = useState(false)

  if (column.filter.type !== 'number') return null
  const { field } = column.filter

  const first = check(min)
  const second = op === 'between' ? check(max) : {}
  const orderError =
    op === 'between' && first.value !== undefined && second.value !== undefined && first.value > second.value
      ? 'Min must be less than or equal to max'
      : undefined
  const minError = submitted ? first.error : undefined
  const maxError = submitted ? (second.error ?? orderError) : undefined

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (first.value === undefined) return
    if (op === 'between') {
      if (second.value === undefined || orderError) return
      apply(upsertFilter({ field, op, value: [first.value, second.value] }))
    } else {
      apply(upsertFilter({ field, op, value: first.value }))
    }
    close()
  }

  const amountLabel = op === 'between' ? 'Minimum amount' : 'Amount'

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3">
      <h3 id={headingId} className={headingClass}>
        {column.label}
      </h3>
      <Select
        aria-label={`${column.label} condition`}
        value={op}
        onValueChange={(value) => isOp(value) && setOp(value)}
        options={OPS}
        size="sm"
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={ids.min} className="sr-only">
          {amountLabel}
        </label>
        <Input
          id={ids.min}
          size="sm"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          placeholder={op === 'between' ? 'Min' : '0'}
          leftAdornment="$"
          value={min}
          onChange={(event) => setMin(event.currentTarget.value)}
          invalid={!!minError}
          aria-describedby={minError ? `${ids.error}-min` : undefined}
        />
        {minError ? (
          <p id={`${ids.error}-min`} className={errorClass}>
            {minError}
          </p>
        ) : null}
      </div>
      {op === 'between' ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.max} className="sr-only">
            Maximum amount
          </label>
          <Input
            id={ids.max}
            size="sm"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            placeholder="Max"
            leftAdornment="$"
            value={max}
            onChange={(event) => setMax(event.currentTarget.value)}
            invalid={!!maxError}
            aria-describedby={maxError ? `${ids.error}-max` : undefined}
          />
          {maxError ? (
            <p id={`${ids.error}-max`} className={errorClass}>
              {maxError}
            </p>
          ) : null}
        </div>
      ) : null}
      <Button type="submit" size="sm" className="self-end">
        Apply
      </Button>
    </form>
  )
}
