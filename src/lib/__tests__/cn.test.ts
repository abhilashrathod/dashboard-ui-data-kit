import { describe, expect, it } from 'vitest'
import { cn } from '../cn'

describe('cn', () => {
  it('keeps a text color next to a custom font size', () => {
    expect(cn('text-fg', 'text-display')).toBe('text-fg text-display')
    expect(cn('text-fg-muted', 'text-display-sm')).toBe('text-fg-muted text-display-sm')
    expect(cn('text-base', 'text-md')).toBe('text-md')
  })

  it('treats the kit sizes, radii and shadows as conflicting with their defaults', () => {
    expect(cn('h-control-md', 'h-control-sm')).toBe('h-control-sm')
    expect(cn('h-8', 'h-row')).toBe('h-row')
    expect(cn('p-4', 'p-card')).toBe('p-card')
    expect(cn('rounded-lg', 'rounded-pill')).toBe('rounded-pill')
    expect(cn('shadow-none', 'shadow-overlay')).toBe('shadow-overlay')
  })

  it('treats the gradient as a background image, not a color', () => {
    expect(cn('bg-surface', 'bg-gradient-accent')).toBe('bg-surface bg-gradient-accent')
  })

  it('lets later colors win', () => {
    expect(cn('bg-surface', 'bg-surface-muted')).toBe('bg-surface-muted')
  })
})
