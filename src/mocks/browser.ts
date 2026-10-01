import { setupWorker, type StartOptions } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

/** Starts the worker. The script is served from public/ at /mockServiceWorker.js (MSW's default URL). */
export async function startMockWorker(options: StartOptions = {}): Promise<typeof worker> {
  await worker.start({
    // MSW 3 renamed onUnhandledRequest → onUnhandledFrame; the old key is silently ignored.
    onUnhandledFrame: 'bypass',
    ...options,
  })
  return worker
}
