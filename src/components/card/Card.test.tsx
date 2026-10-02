import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './Card'

describe('Card', () => {
  it('composes header, title, description and body', () => {
    render(
      <Card>
        <Card.Header actions={<button type="button">Export</button>}>
          <Card.Title as="h2">Overview</Card.Title>
          <Card.Description>Last 30 days</Card.Description>
        </Card.Header>
        <Card.Body>Content</Card.Body>
      </Card>,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByText('Last 30 days')).toHaveClass('text-fg-muted')
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
  })

  it('defaults the title to h3', () => {
    render(<Card.Title>Orders</Card.Title>)
    expect(screen.getByRole('heading', { level: 3, name: 'Orders' })).toBeInTheDocument()
  })

  it('exposes the variant as data-variant and merges className', () => {
    const { container } = render(<Card variant="tile" className="p-2" />)
    expect(container.firstChild).toHaveAttribute('data-variant', 'tile')
    expect(container.firstChild).toHaveClass('bg-surface-subtle', 'p-2')
    expect(container.firstChild).not.toHaveClass('p-tile')
  })
})
