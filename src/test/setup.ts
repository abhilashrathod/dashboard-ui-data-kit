import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '@/mocks/node'

beforeAll(() => {
  // MSW 3: onUnhandledFrame (formerly onUnhandledRequest). Unmocked requests fail the test.
  server.listen({ onUnhandledFrame: 'error' })
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
