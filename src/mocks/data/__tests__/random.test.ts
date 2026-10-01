import { describe, expect, it } from 'vitest'
import { chance, createRng, int, logNormal, pick, weighted } from '../random'

const sample = <T>(n: number, draw: () => T): T[] => Array.from({ length: n }, draw)

describe('random helpers', () => {
  it('createRng is deterministic per seed and stays in [0, 1)', () => {
    const a = sample(1000, createRng(123))
    expect(sample(1000, createRng(123))).toEqual(a)
    expect(sample(1000, createRng(124))).not.toEqual(a)
    expect(a.every((x) => x >= 0 && x < 1)).toBe(true)
  })

  it('int is inclusive at both ends', () => {
    const rng = createRng(1)
    const values = new Set(sample(2000, () => int(rng, 3, 6)))
    expect([...values].sort()).toEqual([3, 4, 5, 6])
  })

  it('pick returns members and throws on an empty array', () => {
    const rng = createRng(2)
    expect(['a', 'b']).toContain(pick(rng, ['a', 'b']))
    expect(() => pick(rng, [])).toThrow(RangeError)
  })

  it('weighted and chance follow their probabilities', () => {
    const rng = createRng(3)
    const draws = sample(20_000, () =>
      weighted(rng, [
        ['x', 3],
        ['y', 1],
      ] as const),
    )
    expect(draws.filter((d) => d === 'x').length / draws.length).toBeCloseTo(0.75, 1)
    expect(sample(20_000, () => chance(rng, 0.2)).filter(Boolean).length / 20_000).toBeCloseTo(
      0.2,
      1,
    )
  })

  it('logNormal has median ≈ exp(mu)', () => {
    const rng = createRng(4)
    const values = sample(20_000, () => logNormal(rng, Math.log(100), 0.8)).sort((a, b) => a - b)
    expect(values[10_000]).toBeGreaterThan(95)
    expect(values[10_000]).toBeLessThan(105)
  })
})
