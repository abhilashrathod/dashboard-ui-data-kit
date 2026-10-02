import { Search, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { mergeRefs } from '@/lib/merge-refs'
import { IconButton } from '../icon-button'
import { Input, type InputProps } from './Input'

export type SearchInputProps = Omit<InputProps, 'type' | 'leftAdornment' | 'rightAdornment'>

/** Set a value the way the browser would, so React's onChange fires (controlled or not). */
function setValueAsUser(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
  descriptor?.set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Input + search icon + a "Clear search" button that appears when there is a
 * value. Clearing fires onChange with "" and puts focus back in the field.
 * Works controlled (value + onChange) or uncontrolled (defaultValue).
 */
export function SearchInput({
  value,
  defaultValue,
  onChange,
  className,
  ref,
  ...props
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uncontrolledHasValue, setUncontrolledHasValue] = useState(
    () => defaultValue !== undefined && String(defaultValue) !== '',
  )
  const hasValue = value !== undefined ? String(value) !== '' : uncontrolledHasValue

  const clear = () => {
    const input = inputRef.current
    if (!input) return
    setValueAsUser(input, '')
    input.focus()
  }

  return (
    <Input
      ref={mergeRefs(ref, inputRef)}
      type="search"
      value={value}
      defaultValue={defaultValue}
      onChange={(event) => {
        setUncontrolledHasValue(event.target.value !== '')
        onChange?.(event)
      }}
      leftAdornment={<Search />}
      rightAdornment={
        hasValue ? (
          <IconButton
            variant="ghost"
            size="sm"
            className="size-6"
            aria-label="Clear search"
            onClick={clear}
          >
            <X />
          </IconButton>
        ) : null
      }
      className={cn(hasValue && 'pr-2', className)}
      {...props}
    />
  )
}
