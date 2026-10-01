import { useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'dashboard-ui-kit:theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

const listeners = new Set<() => void>()
let preference: ThemePreference | undefined
let mediaQuery: MediaQueryList | undefined

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

function writeStoredPreference(value: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, value)
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); the
    // in-memory preference still applies for this session.
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function applyTheme(): void {
  document.documentElement.dataset.theme = getResolvedTheme()
}

function notify(): void {
  for (const listener of listeners) listener()
}

function handleSystemChange(): void {
  if (getTheme() !== 'system') return
  applyTheme()
  notify()
}

/** The user's stored choice: 'light', 'dark' or 'system' (the default). */
export function getTheme(): ThemePreference {
  preference ??= readStoredPreference()
  return preference
}

/** The theme actually in effect, with 'system' resolved via prefers-color-scheme. */
export function getResolvedTheme(): ResolvedTheme {
  const current = getTheme()
  return current === 'system' ? getSystemTheme() : current
}

/** Persist a preference and apply it to <html data-theme>. */
export function setTheme(next: ThemePreference): void {
  preference = next
  writeStoredPreference(next)
  applyTheme()
  notify()
}

/**
 * Apply the stored preference and follow OS changes while in 'system' mode.
 * Call once at startup, before rendering. Returns a cleanup function.
 */
export function initTheme(): () => void {
  applyTheme()
  if (typeof window.matchMedia === 'function' && !mediaQuery) {
    mediaQuery = window.matchMedia(DARK_QUERY)
    mediaQuery.addEventListener('change', handleSystemChange)
  }
  return () => {
    mediaQuery?.removeEventListener('change', handleSystemChange)
    mediaQuery = undefined
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme(): {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  setTheme: typeof setTheme
} {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'system' as const)
  const resolvedTheme = useSyncExternalStore(subscribe, getResolvedTheme, () => 'light' as const)
  return { theme, resolvedTheme, setTheme }
}
