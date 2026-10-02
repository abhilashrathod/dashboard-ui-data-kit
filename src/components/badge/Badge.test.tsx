import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('applies the tone × variant classes', () => {
    render(
      <>
        <Badge tone="success">Paid</Badge>
        <Badge tone="danger" variant="outline">
          Overdue
        </Badge>
      </>,
    )
    expect(screen.getByText('Paid')).toHaveClass(
      'bg-status-success-subtle',
      'text-status-success-fg',
    )
    expect(screen.getByText('Overdue')).toHaveClass('border-status-danger', 'text-status-danger-fg')
  })

  it('renders a decorative dot', () => {
    render(
      <Badge tone="info" dot>
        Shipped
      </Badge>,
    )
    const dot = screen.getByText('Shipped').querySelector('span')
    expect(dot).toHaveAttribute('aria-hidden', 'true')
    expect(dot).toHaveClass('bg-status-info')
  })
})
