/** A seeded random source returning floats in [0, 1). */
export type Rng = () => number

/** mulberry32: tiny, fast, and good enough for mock data. Same seed → same sequence. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

/** Integer in [min, max], inclusive. */
export function int(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[int(rng, 0, items.length - 1)]
  if (item === undefined) throw new RangeError('pick() needs a non-empty array')
  return item
}

/** Picks a value with probability proportional to its weight. */
export function weighted<T>(rng: Rng, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let remaining = rng() * total
  for (const [value, weight] of entries) {
    remaining -= weight
    if (remaining < 0) return value
  }
  return pick(rng, entries)[0] // only reachable through float rounding at the very end
}

/** True with probability p. */
export function chance(rng: Rng, p: number): boolean {
  return rng() < p
}

/** Log-normal sample: exp(mu + sigma·z), with z standard normal via Box–Muller. */
export function logNormal(rng: Rng, mu: number, sigma: number): number {
  const u1 = 1 - rng() // (0, 1]: avoids log(0)
  const u2 = rng()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return Math.exp(mu + sigma * z)
}
