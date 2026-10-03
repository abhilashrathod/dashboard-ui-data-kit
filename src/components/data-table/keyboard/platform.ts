/** What platform detection reads; `navigator` fits. */
export interface PlatformInfo {
  platform?: string
  userAgent?: string
  /** Chromium's User-Agent Client Hints. */
  userAgentData?: { platform?: string }
}

/**
 * Apple keyboards (macOS, iPadOS with a keyboard) use ⌘ where others use Ctrl.
 * Prefers User-Agent Client Hints, then the legacy `navigator.platform`, then
 * the user agent string. Only used for LABELS (the help dialog): the grid
 * itself accepts both Ctrl and ⌘ everywhere, so a wrong guess costs nothing
 * but the hint's wording.
 */
export function isApplePlatform(info: PlatformInfo | undefined = globalThis.navigator): boolean {
  if (!info) return false
  const platform = info.userAgentData?.platform || info.platform || info.userAgent || ''
  return /mac|iphone|ipad|ipod/i.test(platform)
}

/** "⌘" on Apple platforms, "Ctrl" elsewhere. */
export function modifierLabel(apple = isApplePlatform()): '⌘' | 'Ctrl' {
  return apple ? '⌘' : 'Ctrl'
}
