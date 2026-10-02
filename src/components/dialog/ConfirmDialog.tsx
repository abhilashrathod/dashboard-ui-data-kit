import { useRef, useState, type ReactNode } from 'react'
import { Button } from '../button'
import { Dialog } from './Dialog'

export type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  /** Default "Confirm". Name the action: "Delete order", "Refund $80". */
  confirmLabel?: ReactNode
  /** "danger" for destructive actions: red confirm button, focus starts on Cancel. */
  tone?: 'default' | 'danger'
  /**
   * Runs on confirm. If it returns a Promise, the button shows loading until it
   * settles: resolve closes the dialog; reject keeps it open with the error.
   */
  onConfirm: () => void | Promise<void>
}

const errorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : 'Something went wrong. Try again.'

/**
 * "Are you sure?" as an alertdialog: no close button, no closing by clicking
 * outside, and Escape/Cancel are disabled while the action is running.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  const handleOpenChange = (next: boolean) => {
    // Don't let Escape close the dialog mid-request: the outcome would be lost.
    if (pending) return
    if (!next) setError(null)
    onOpenChange(next)
  }

  const handleConfirm = async () => {
    setError(null)
    setPending(true)
    try {
      await onConfirm()
      setPending(false)
      onOpenChange(false)
    } catch (caught) {
      setPending(false)
      setError(errorMessage(caught))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content
        size="sm"
        role="alertdialog"
        hideClose
        // Without a description, opt out explicitly (Radix warns otherwise).
        {...(description ? {} : { 'aria-describedby': undefined })}
        onInteractOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => {
          // Initial focus decides what Enter does. For a destructive action it
          // starts on Cancel, so a reflexive Enter can't delete anything. For a
          // safe action it starts on Confirm: the expected path is one keystroke.
          event.preventDefault()
          const target = tone === 'danger' ? cancelRef.current : confirmRef.current
          target?.focus()
        }}
      >
        <Dialog.Header className="pr-0">
          <Dialog.Title>{title}</Dialog.Title>
          {description ? <Dialog.Description>{description}</Dialog.Description> : null}
        </Dialog.Header>

        {error ? (
          <p
            role="alert"
            className="rounded-md bg-status-danger-subtle px-3 py-2 text-sm text-status-danger-fg"
          >
            {error}
          </p>
        ) : null}

        <Dialog.Footer>
          <Button
            ref={cancelRef}
            variant="ghost"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            ref={confirmRef}
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={pending}
            onClick={() => void handleConfirm()}
          >
            {confirmLabel}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  )
}
