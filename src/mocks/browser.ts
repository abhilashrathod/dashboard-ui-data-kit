import { setupWorker, type StartOptions } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

/**
 * The worker script lives in public/, so it is served under the Vite base.
 * On GitHub Pages that is a subpath (/<repo>/demo/), and in a Storybook build
 * it is the relative "./". Hard-coding "/mockServiceWorker.js" would 404 there
 * and mocks would silently stop working in production.
 */
export const workerUrl = `${import.meta.env.BASE_URL}mockServiceWorker.js`

export async function startMockWorker(options: StartOptions = {}): Promise<typeof worker> {
  await worker.start({
    // MSW 3 renamed onUnhandledRequest → onUnhandledFrame; the old key is silently ignored.
    onUnhandledFrame: 'bypass',
    ...options,
    serviceWorker: { ...options.serviceWorker, url: workerUrl },
  })
  return worker
}
