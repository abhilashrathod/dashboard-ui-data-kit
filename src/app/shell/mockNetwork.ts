import type { MockNetworkHandle } from '@/mocks/browser'
import type { EndpointKey, NetworkMode } from '@/mocks/network'

/*
 * The Demo controls talk to the mock layer only through window.__mockNetwork,
 * which startMockWorker sets before the app renders. Importing the mocks
 * module here would pull MSW and the 10k-order generator into the main
 * bundle; these imports are type-only, so the mocks stay in their lazy chunk.
 * When the worker isn't running (a build without mocks) the handle is absent
 * and the controls hide themselves.
 */

export type { EndpointKey, NetworkMode }

export interface DemoNetworkState {
  mode: NetworkMode
  failEndpoints: EndpointKey[]
}

export const NORMAL_STATE: DemoNetworkState = { mode: 'normal', failEndpoints: [] }

function handle(): MockNetworkHandle | undefined {
  return typeof window === 'undefined' ? undefined : window.__mockNetwork
}

export const mockNetwork = {
  available: () => handle() !== undefined,

  /** The current config, e.g. as set from ?network= / ?fail= on load. */
  read(): DemoNetworkState {
    const config = handle()?.get()
    return config
      ? { mode: config.mode, failEndpoints: [...config.failEndpoints] }
      : NORMAL_STATE
  },

  write(next: Partial<DemoNetworkState>): void {
    handle()?.set(next)
  },

  /** Normal network and freshly seeded data. */
  reset(): void {
    const h = handle()
    h?.reset()
    h?.resetDb()
  },
}
