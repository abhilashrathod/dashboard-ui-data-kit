import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { resetDb } from '@/mocks/data/db'
import { resetNetworkConfig, setNetworkConfig } from '@/mocks/network'
import { server } from '@/mocks/node'

/** Fixed anchor, so generated data and metrics are identical on every run. */
export const TEST_ANCHOR = new Date('2026-09-30T00:00:00Z')

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
})

afterAll(() => {
  server.close()
})
