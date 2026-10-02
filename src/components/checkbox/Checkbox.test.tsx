import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('sets the indeterminate DOM property (reported as mixed)', () => {
    const { rerender } = render(<Checkbox aria-label="Select all" indeterminate />)
    const checkbox = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Select all' })
    expect(checkbox.indeterminate).toBe(true)
    expect(checkbox).toBePartiallyChecked()

    rerender(<Checkbox aria-label="Select all" indeterminate={false} />)
    expect(checkbox.indeterminate).toBe(false)
    expect(checkbox).not.toBePartiallyChecked()
  })

  it('associates the visible label, and clicking it toggles', async () => {
    render(<Checkbox label="Email me receipts" />)
    const checkbox = screen.getByLabelText('Email me receipts')
    expect(checkbox).toHaveAttribute('type', 'checkbox')
    await userEvent.click(screen.getByText('Email me receipts'))
    expect(checkbox).toBeChecked()
  })

  it('toggles with Space', async () => {
    render(<Checkbox aria-label="Row 1" />)
    const checkbox = screen.getByRole('checkbox', { name: 'Row 1' })
    checkbox.focus()
    await userEvent.keyboard(' ')
    expect(checkbox).toBeChecked()
  })

  it('requires a label or aria-label at the type level', () => {
    // @ts-expect-error label, aria-label or aria-labelledby is required
    const unnamed = <Checkbox />
    expect(unnamed).toBeTruthy()
  })
})
