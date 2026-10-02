import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('announces a label as a status', () => {
    render(<Spinner label="Loading orders" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading orders')
  })

  it('is hidden from assistive tech without a label', () => {
    const { container } = render(<Spinner />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })
})
