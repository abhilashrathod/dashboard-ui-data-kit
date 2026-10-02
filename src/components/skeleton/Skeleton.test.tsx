import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Skeleton, SkeletonText } from './Skeleton'

describe('Skeleton', () => {
  it('is aria-hidden and sized by className', () => {
    const { container } = render(<Skeleton shape="pill" className="h-4 w-24" />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.firstChild).toHaveClass('rounded-pill', 'h-4', 'w-24')
  })

  it('renders n lines with a shorter last line', () => {
    const { container } = render(<SkeletonText lines={4} />)
    const lines = container.firstElementChild!.children
    expect(lines).toHaveLength(4)
    expect(lines[0]).toHaveClass('w-full')
    expect(lines[3]).toHaveClass('w-3/5')
  })
})
