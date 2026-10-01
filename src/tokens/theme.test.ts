import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as ThemeModule from './theme'

/** jsdom has no matchMedia; this stub reports a controllable prefers-color-scheme. */
function mockSystemTheme(initial: 'light' | 'dark') {
  let isDark = initial === 'dark'
  const listeners = new Set<() => void>()
  const mediaQueryList = {
    get matches() {
      return isDark
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQueryList),
  )
  return {
    change(next: 'light' | 'dark') {
      isDark = next === 'dark'
      for (const listener of listeners) listener()
    },
  }
}

const dataTheme = () => document.documentElement.dataset.theme

describe('theme', () => {
  let theme: typeof ThemeModule

  beforeEach(async () => {
    // The module caches the preference, so each test gets a fresh instance.
    vi.resetModules()
    theme = await import('./theme')
  })

  it('sets data-theme on <html> and persists the choice', () => {
    mockSystemTheme('light')

    theme.setTheme('dark')
    expect(dataTheme()).toBe('dark')
    expect(theme.getTheme()).toBe('dark')
    expect(window.localStorage.getItem(theme.THEME_STORAGE_KEY)).toBe('dark')

    theme.setTheme('light')
    expect(dataTheme()).toBe('light')
    expect(window.localStorage.getItem(theme.THEME_STORAGE_KEY)).toBe('light')
  })

  it('falls back to the system preference when nothing is stored', () => {
    mockSystemTheme('dark')

    theme.initTheme()

    expect(theme.getTheme()).toBe('system')
    expect(dataTheme()).toBe('dark')
  })

  it("follows OS changes while set to 'system'", () => {
    const system = mockSystemTheme('light')
    theme.initTheme()
    theme.setTheme('system')
    expect(dataTheme()).toBe('light')

    system.change('dark')
    expect(dataTheme()).toBe('dark')

    // An explicit choice is not overridden by the OS.
    theme.setTheme('light')
    system.change('dark')
    expect(dataTheme()).toBe('light')
  })

  it('restores a stored preference on startup', () => {
    mockSystemTheme('light')
    window.localStorage.setItem('dashboard-ui-kit:theme', 'dark')

    theme.initTheme()

    expect(theme.getTheme()).toBe('dark')
    expect(dataTheme()).toBe('dark')
  })

  it('still applies the theme when localStorage throws', () => {
    mockSystemTheme('dark')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    theme.initTheme()
    expect(dataTheme()).toBe('dark')

    theme.setTheme('light')
    expect(theme.getTheme()).toBe('light')
    expect(dataTheme()).toBe('light')
  })
})
