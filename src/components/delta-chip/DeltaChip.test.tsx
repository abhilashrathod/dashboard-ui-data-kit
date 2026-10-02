import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MINUS } from '@/lib/format'
import { computeDelta } from './delta'
import { DeltaChip } from './DeltaChip'

describe('computeDelta', () => {
  it('computes the percent change against |previous|', () => {
    expect(computeDelta(107, 100, 'up')).toMatchObject({ direction: 'up', text: '7%' })
    expect(computeDelta(112.4, 100, 'up').change).toBeCloseTo(0.124)
    expect(computeDelta(112.4, 100, 'up').text).toBe('12.4%')
    expect(computeDelta(50, 200, 'up')).toMatchObject({ direction: 'down', text: '75%' })
    // From −100 to −50 is an improvement of 50%.
    expect(computeDelta(-50, -100, 'up')).toMatchObject({ direction: 'up', text: '50%' })
  })

  it('tones by direction for goodWhen "up" (e.g. revenue)', () => {
    expect(computeDelta(110, 100, 'up').tone).toBe('success')
    expect(computeDelta(90, 100, 'up').tone).toBe('danger')
  })

  it('tones by direction for goodWhen "down" (e.g. refund rate)', () => {
    expect(computeDelta(110, 100, 'down').tone).toBe('danger')
    expect(computeDelta(90, 100, 'down').tone).toBe('success')
  })

  it('is neutral and "0%" when unchanged, including changes that round to 0.0%', () => {
    expect(computeDelta(100, 100, 'up')).toMatchObject({
      direction: 'flat',
      tone: 'neutral',
      text: '0%',
    })
    expect(computeDelta(100.04, 100, 'up')).toMatchObject({ direction: 'flat', tone: 'neutral' })
    expect(computeDelta(0, 0, 'up')).toMatchObject({ direction: 'flat', tone: 'neutral' })
  })

  it('shows "New" (never Infinity%) when previous is 0', () => {
    const delta = computeDelta(250, 0, 'up')
    expect(delta).toMatchObject({ direction: 'new', tone: 'neutral', text: 'New', change: null })
    expect(delta.text).not.toMatch(/Infinity|NaN/)
  })

  it('never shows a sign: the arrow carries direction', () => {
    expect(computeDelta(90, 100, 'up').text).not.toContain(MINUS)
  })
})

describe('DeltaChip', () => {
  it('reads as one sentence; the arrow and number are hidden from screen readers', () => {
    render(
      <p>
        Revenue{' '}
        <DeltaChip current={107} previous={100} goodWhen="up" periodLabel="vs last 30 days" />
      </p>,
    )
    expect(screen.getByText('Increased 7% vs last 30 days')).toHaveClass('sr-only')
    const visible = screen.getByText('7%')
    expect(visible.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(visible.querySelector('svg')).not.toBeNull()
  })

  it('writes the sentence for each direction', () => {
    const { rerender } = render(<DeltaChip current={90} previous={100} goodWhen="down" />)
    expect(screen.getByText('Decreased 10%')).toBeInTheDocument()
    rerender(<DeltaChip current={100} previous={100} goodWhen="up" periodLabel="vs last week" />)
    expect(screen.getByText('Unchanged vs last week')).toBeInTheDocument()
    rerender(<DeltaChip current={5} previous={0} goodWhen="up" />)
    expect(screen.getByText('New, up from 0')).toBeInTheDocument()
  })

  it('exposes direction and tone as data attributes', () => {
    const { container } = render(<DeltaChip current={110} previous={100} goodWhen="down" />)
    expect(container.firstChild).toHaveAttribute('data-direction', 'up')
    expect(container.firstChild).toHaveAttribute('data-tone', 'danger')
    expect(container.firstChild).toHaveClass('bg-status-danger-subtle')
  })
})
