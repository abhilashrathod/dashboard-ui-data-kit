import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as DensityModule from '../density'

const dataDensity = () => document.documentElement.dataset.density

describe('density', () => {
  let density: typeof DensityModule

  beforeEach(async () => {
    // The module caches the value, so each test gets a fresh instance.
    vi.resetModules()
    density = await import('../density')
  })

  it("defaults to 'comfortable'", () => {
    density.initDensity()
    expect(density.getDensity()).toBe('comfortable')
    expect(dataDensity()).toBe('comfortable')
  })

  it('sets data-density on <html> and persists the choice', () => {
    density.setDensity('compact')
    expect(dataDensity()).toBe('compact')
    expect(window.localStorage.getItem(density.DENSITY_STORAGE_KEY)).toBe('compact')
  })

  it('restores a stored density on startup', () => {
    window.localStorage.setItem('dashboard-ui-kit:density', 'compact')
    density.initDensity()
    expect(dataDensity()).toBe('compact')
  })

  it('ignores an invalid stored value', () => {
    window.localStorage.setItem('dashboard-ui-kit:density', 'cozy')
    density.initDensity()
    expect(dataDensity()).toBe('comfortable')
  })

  it('still applies when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    density.initDensity()
    expect(dataDensity()).toBe('comfortable')
    density.setDensity('compact')
    expect(dataDensity()).toBe('compact')
  })

  it('re-renders subscribers via useDensity', () => {
    const { result } = renderHook(() => density.useDensity())
    expect(result.current.density).toBe('comfortable')
    act(() => result.current.setDensity('compact'))
    expect(result.current.density).toBe('compact')
  })
})
