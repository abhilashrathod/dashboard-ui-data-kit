import { http, HttpResponse } from 'msw'

/**
 * Default request handlers, shared by the browser worker (demo app +
 * Storybook) and the Node server (Vitest). Override per story/test with
 * `msw.use()` / `server.use()`.
 */
export const handlers = [http.get('/api/health', () => HttpResponse.json({ ok: true }))]
