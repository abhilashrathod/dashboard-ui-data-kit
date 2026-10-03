import { delay, type HttpResponseResolver } from 'msw'
import type { Order } from '@/contracts'
import { db } from './data/db'
import { apiError } from './http'

export const NETWORK_MODES = ['normal', 'slow', 'error', 'flaky', 'empty'] as const
export type NetworkMode = (typeof NETWORK_MODES)[number]

export const ENDPOINT_KEYS = [
  'orders.list',
  'orders.create',
  'orders.bulkStatus',
  'metrics.kpis',
  'metrics.revenue',
  'metrics.statusBreakdown',
] as const
export type EndpointKey = (typeof ENDPOINT_KEYS)[number]

export interface NetworkConfig {
  mode: NetworkMode
  /** These endpoints always fail with 500, whatever the mode. */
  failEndpoints: EndpointKey[]
  latency: 'realistic' | 'none'
  /** Source for latency and flakiness. Tests inject a scripted sequence. */
  rng: () => number
}

const DEFAULT_CONFIG: Readonly<NetworkConfig> = Object.freeze({
  mode: 'normal',
  failEndpoints: [],
  latency: 'realistic',
  rng: Math.random,
})

let config: NetworkConfig = { ...DEFAULT_CONFIG, failEndpoints: [] }

export function getNetworkConfig(): Readonly<NetworkConfig> {
  return config
}

export function setNetworkConfig(partial: Partial<NetworkConfig>): void {
  config = {
    ...config,
    ...partial,
    failEndpoints: [...(partial.failEndpoints ?? config.failEndpoints)],
  }
}

export function resetNetworkConfig(): void {
  config = { ...DEFAULT_CONFIG, failEndpoints: [] }
}

const LATENCY_MS: Record<'normal' | 'slow', readonly [min: number, max: number]> = {
  normal: [150, 600],
  slow: [1500, 2500],
}

const FLAKY_FAILURE_RATE = 0.3

export interface NetworkContext {
  /** The dataset the endpoint should read: db.orders, or [] in 'empty' mode. */
  orders: Order[]
}

type ResolverInfo = Parameters<HttpResponseResolver>[0]
type NetworkResolver = (info: ResolverInfo, ctx: NetworkContext) => Response | Promise<Response>

/**
 * Wraps a resolver with simulated network behaviour. The checks run in this order:
 *
 * 1. Latency first, so failures take time too, as real ones do, and loading
 *    states are visible before an error appears.
 * 2. failEndpoints: the most specific and deterministic switch. It wins over
 *    any mode, so one widget can be broken while the rest of the page works.
 * 3. mode 'error': every wrapped endpoint fails.
 * 4. mode 'flaky': a random 30% fail with 503 (retryable, unlike the 500s above).
 * 5. Otherwise the real resolver runs. 'empty' only swaps the dataset; it
 *    isn't a failure.
 *
 * With latency 'none' the rng isn't used for waiting, so a scripted rng maps
 * one-to-one onto flaky decisions.
 */
export function withNetwork(
  endpoint: EndpointKey,
  resolver: NetworkResolver,
): HttpResponseResolver {
  return async (info) => {
    const { mode, failEndpoints, latency, rng } = config

    if (latency === 'realistic') {
      const [min, max] = LATENCY_MS[mode === 'slow' ? 'slow' : 'normal']
      await delay(Math.round(min + rng() * (max - min)))
    }

    if (failEndpoints.includes(endpoint)) {
      return apiError(500, 'SERVER_ERROR', `Simulated failure: ${endpoint}`)
    }
    if (mode === 'error') {
      return apiError(500, 'SERVER_ERROR', 'Simulated server error')
    }
    if (mode === 'flaky' && rng() < FLAKY_FAILURE_RATE) {
      return apiError(503, 'UNAVAILABLE', 'Simulated flaky network: service unavailable')
    }

    return resolver(info, { orders: mode === 'empty' ? [] : db.orders })
  }
}

const isNetworkMode = (value: string): value is NetworkMode =>
  (NETWORK_MODES as readonly string[]).includes(value)
const isEndpointKey = (value: string): value is EndpointKey =>
  (ENDPOINT_KEYS as readonly string[]).includes(value)

/**
 * Reads `?network=slow` and `?fail=metrics.kpis,orders.list` (repeatable).
 * Invalid values are ignored; keys are only set when something valid was found.
 */
export function parseNetworkFromSearch(search: string): Partial<NetworkConfig> {
  const params = new URLSearchParams(search)
  const result: Partial<NetworkConfig> = {}

  const mode = params.get('network')
  if (mode !== null && isNetworkMode(mode)) result.mode = mode

  const failEndpoints = [
    ...new Set(
      params
        .getAll('fail')
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter(isEndpointKey),
    ),
  ]
  if (failEndpoints.length > 0) result.failEndpoints = failEndpoints

  return result
}
