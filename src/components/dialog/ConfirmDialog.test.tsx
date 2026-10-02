import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog'

function Harness(props: Pick<ConfirmDialogProps, 'onConfirm' | 'tone'>) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <p data-testid="state">{open ? 'open' : 'closed'}</p>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete order?"
        description="This can't be undone."
        confirmLabel="Delete"
        {...props}
      />
    </>
  )
}

function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('ConfirmDialog', () => {
  it('shows loading while the promise is pending, then closes on resolve', async () => {
    const pending = deferred()
    render(<Harness onConfirm={() => pending.promise} />)
    const confirm = screen.getByRole('button', { name: 'Delete' })

    await userEvent.click(confirm)
    expect(confirm).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByTestId('state')).toHaveTextContent('open')

    pending.resolve()
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('closed'))
  })

  it('stays open with an inline error on reject, and a retry can succeed', async () => {
    const onConfirm = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('Network error: order not deleted.'))
      .mockResolvedValueOnce(undefined)
    render(<Harness tone="danger" onConfirm={onConfirm} />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Network error: order not deleted.')
    expect(screen.getByTestId('state')).toHaveTextContent('open')
    expect(screen.getByRole('button', { name: 'Delete' })).not.toHaveAttribute('aria-busy')

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('closed'))
    expect(onConfirm).toHaveBeenCalledTimes(2)
  })

  it('closes immediately for a synchronous onConfirm', async () => {
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('closed'))
  })

  it('is an alertdialog named by its title', () => {
    render(<Harness onConfirm={vi.fn()} />)
    expect(screen.getByRole('alertdialog', { name: 'Delete order?' })).toBeInTheDocument()
  })
})
