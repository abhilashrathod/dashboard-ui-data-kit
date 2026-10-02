import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { resetDb } from '@/mocks/data/db'
import { resetNetworkConfig, setNetworkConfig } from '@/mocks/network'
import { server } from '@/mocks/node'

/** Fixed anchor, so generated data and metrics are identical on every run. */
export const TEST_ANCHOR = new Date('2026-09-30T00:00:00Z')

/*
 * jsdom polyfills for Radix (layout and pointer APIs jsdom doesn't implement).
 * Interaction behavior is tested in real Chromium via Storybook play tests;
 * these only let Radix components mount and handle clicks here.
 */
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function polyfill(target: object, name: string, value: unknown) {
  if (!(name in target))
    Object.defineProperty(target, name, { value, configurable: true, writable: true })
}
polyfill(Element.prototype, 'hasPointerCapture', () => false)
polyfill(Element.prototype, 'setPointerCapture', () => {})
polyfill(Element.prototype, 'releasePointerCapture', () => {})
polyfill(Element.prototype, 'scrollIntoView', () => {})
polyfill(window, 'matchMedia', (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
}))

/*
 * Accessibility guard: Radix reports a Dialog/Drawer without a title (and other
 * a11y misuse) via console.error in development. Fail the test instead of
 * letting it scroll by.
 */
const consoleError = console.error.bind(console)
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = args.map(String).join(' ')
    if (message.includes('DialogTitle') || message.includes('DialogContent')) {
      throw new Error(`Radix accessibility error: ${message}`)
    }
    consoleError(...args)
  })
})

beforeAll(() => {
  // MSW 3: onUnhandledFrame (formerly onUnhandledRequest). Unmocked requests fail the test.
  server.listen({ onUnhandledFrame: 'error' })
})

beforeEach(() => {
  resetDb({ anchor: TEST_ANCHOR })
  resetNetworkConfig()
  setNetworkConfig({ latency: 'none' })
})

afterEach(() => {
  server.resetHandlers()
  cleanup()
  try {
    window.localStorage.clear()
  } catch {
    // Not every test environment exposes storage.
  }
  delete document.documentElement.dataset.theme
  delete document.documentElement.dataset.density
})

afterAll(() => {
  server.close()
})
