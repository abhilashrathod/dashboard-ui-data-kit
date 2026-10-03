import { setupWorker, type StartOptions } from 'msw/browser'
import { resetDb } from './data/db'
import { handlers } from './handlers'
import {
  getNetworkConfig,
  parseNetworkFromSearch,
  resetNetworkConfig,
  setNetworkConfig,
} from './network'

export const worker = setupWorker(...handlers)

/** Console handle for the simulated network, e.g. `__mockNetwork.set({ mode: 'empty' })`. */
export interface MockNetworkHandle {
  get: typeof getNetworkConfig
  set: typeof setNetworkConfig
  reset: typeof resetNetworkConfig
  /** Re-seed the in-memory orders (undoes creates and status changes). */
  resetDb: () => void
}

declare global {
  interface Window {
    /** Present whenever the mock worker is running (dev, Storybook, the deployed demo). */
    __mockNetwork?: MockNetworkHandle
  }
}

/**
 * Starts the worker. The script is served from public/ at /mockServiceWorker.js
 * (MSW's default URL).
 *
 * Before starting, the network simulation picks up `?network=slow` /
 * `?fail=metrics.kpis` from the page URL (so a link can demo a failure state),
 * and `window.__mockNetwork` is exposed for changing it from the console.
 */
export async function startMockWorker(options: StartOptions = {}): Promise<typeof worker> {
  setNetworkConfig(parseNetworkFromSearch(window.location.search))
  window.__mockNetwork = {
    get: getNetworkConfig,
    set: setNetworkConfig,
    reset: resetNetworkConfig,
    resetDb: () => resetDb(),
  }

  await worker.start({
    // MSW 3 renamed onUnhandledRequest → onUnhandledFrame; the old key is silently ignored.
    onUnhandledFrame: 'bypass',
    ...options,
  })
  return worker
}
