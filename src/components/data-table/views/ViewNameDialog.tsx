import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../button'
import { Dialog } from '../../dialog'
import { Input } from '../../input'
import { VIEW_NAME_MAX } from './savedViews'

export interface ViewNameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  submitLabel: string
  initialName?: string
  /** An error message, or undefined when the name is fine. Required, length and uniqueness. */
  validate: (name: string) => string | undefined
  onSubmit: (name: string) => void
  /** Where focus goes on close (the menu item that opened it is gone). */
  onCloseAutoFocus?: (event: Event) => void
}

/** Name a view: save a new one, or rename. The form remounts on open, so it starts fresh. */
export function ViewNameDialog({ open, onOpenChange, ...props }: ViewNameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        size="sm"
        aria-describedby={undefined}
        onCloseAutoFocus={props.onCloseAutoFocus}
      >
        {open ? <ViewNameForm {...props} onCancel={() => onOpenChange(false)} /> : null}
      </Dialog.Content>
    </Dialog>
  )
}

function ViewNameForm({
  title,
  submitLabel,
  initialName = '',
  validate,
  onSubmit,
  onCancel,
}: Omit<ViewNameDialogProps, 'open' | 'onOpenChange' | 'onCloseAutoFocus'> & {
  onCancel: () => void
}) {
  const ids = { input: useId(), error: useId() }
  const [name, setName] = useState(initialName)
  const [submitted, setSubmitted] = useState(false)
  const error = submitted ? validate(name) : undefined

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (validate(name)) return
    onSubmit(name.trim())
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <Dialog.Header>
        <Dialog.Title>{title}</Dialog.Title>
      </Dialog.Header>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.input} className="text-sm font-medium">
          Name
        </label>
        <Input
          id={ids.input}
          value={name}
          maxLength={VIEW_NAME_MAX}
          autoComplete="off"
          // eslint-disable-next-line jsx-a11y/no-autofocus -- the dialog's only field
          autoFocus
          onChange={(event) => setName(event.currentTarget.value)}
          invalid={!!error}
          aria-describedby={error ? ids.error : undefined}
        />
        {error ? (
          <p id={ids.error} className="text-xs text-status-danger-fg">
            {error}
          </p>
        ) : (
          <p className="text-xs text-fg-muted">
            {name.trim().length}/{VIEW_NAME_MAX}
          </p>
        )}
      </div>
      <Dialog.Footer>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </Dialog.Footer>
    </form>
  )
}
