import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MINUS } from '@/lib/format'
import { Amount } from './Amount'

/**
 * Wrapping in a button lets us read the computed accessible name: an exact
 * match proves the value is announced once (no doubled "dollar").
 */
function renderNamed(ui: React.ReactNode) {
  render(<button type="button">{ui}</button>)
  return screen.getByRole('button')
}

describe('Amount', () => {
  it('gives screen readers the value exactly once when the glyph is split out', () => {
    const button = renderNamed(<Amount value={48210.5} size="display" />)
    expect(button).toHaveAccessibleName('$48,210.50')
    expect(button.querySelector('[data-slot="glyph"]')).toHaveTextContent('$')
  })

  it('renders plain text without a glyph (the default below display sizes)', () => {
    const button = renderNamed(<Amount value={1234.5} />)
    expect(button).toHaveAccessibleName('$1,234.50')
    expect(button.querySelector('[data-slot="glyph"]')).toBeNull()
  })

  it('colors the glyph by size: accent at display, accent-text below', () => {
    render(
      <>
        <Amount value={1} size="display" />
        <Amount value={1} size="sm" glyph />
      </>,
    )
    const [display, small] = document.querySelectorAll('[data-slot="glyph"]')
    expect(display).toHaveClass('text-accent')
    expect(small).toHaveClass('text-accent-text')
  })

  it('formats compact and negative values with a real minus, uncolored', () => {
    const button = renderNamed(<Amount value={-14000} compact size="display-sm" />)
    expect(button).toHaveAccessibleName(`${MINUS}$14K`)
    expect(button.firstElementChild?.className).not.toMatch(/danger/)
  })

  it('uses tabular digits', () => {
    const button = renderNamed(<Amount value={1} />)
    expect(button.firstElementChild).toHaveClass('tabular')
  })
})
