import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/** Node-side MSW server for Vitest, with the same handlers as the browser worker. Override with `server.use()`. */
export const server = setupServer(...handlers)
