import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ORDER_STATUSES } from '@/contracts'
import { ORDER_STATUS_DISPLAY, StatusPill } from './StatusPill'

describe('StatusPill', () => {
  it('maps every OrderStatus to a tone and a visible label', () => {
    expect(Object.keys(ORDER_STATUS_DISPLAY).sort()).toEqual([...ORDER_STATUSES].sort())
    for (const status of ORDER_STATUSES) {
      const { unmount } = render(<StatusPill status={status} />)
      const { label, tone } = ORDER_STATUS_DISPLAY[status]
      const pill = screen.getByText(label)
      expect(pill).toHaveAttribute('data-tone', tone)
      expect(pill).toHaveAttribute('data-status', status)
      // The dot is decorative; the label carries the status.
      expect(pill.querySelector('[aria-hidden="true"]')).not.toBeNull()
      unmount()
    }
  })

  it('uses the agreed tones', () => {
    expect(ORDER_STATUS_DISPLAY).toMatchObject({
      pending: { tone: 'warning' },
      paid: { tone: 'success' },
      shipped: { tone: 'info' },
      refunded: { tone: 'neutral' },
      failed: { tone: 'danger' },
    })
  })
})
