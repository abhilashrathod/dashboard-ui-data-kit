import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VisuallyHidden } from './VisuallyHidden'

describe('VisuallyHidden', () => {
  it('keeps text in the accessibility tree with the sr-only technique', () => {
    render(
      <button type="button">
        <VisuallyHidden>Close dialog</VisuallyHidden>
      </button>,
    )
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument()
    expect(screen.getByText('Close dialog')).toHaveClass('sr-only')
  })
})
