import { describe, expect, it } from 'vitest'
import { TOKENS } from '../tokens'
import { allVars, COMPACT, DARK, LIGHT, readTokensCss, varsFor } from './tokens-css'

const blocks = readTokensCss()
const root = varsFor(blocks, ':root')
const light = varsFor(blocks, LIGHT)
const dark = varsFor(blocks, DARK)
const compact = varsFor(blocks, COMPACT)

const themed = TOKENS.filter((token) => token.scope === 'theme').map((token) => token.name)
const shared = TOKENS.filter((token) => token.scope === 'global').map((token) => token.name)

describe('token drift (manifest ↔ tokens.css)', () => {
  it('has no duplicate names in the manifest', () => {
    const names = TOKENS.map((token) => token.name)
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([])
  })

  it('defines every themed token in both the light and dark blocks', () => {
    expect(themed.filter((name) => !light.has(name) || !root.has(name))).toEqual([])
    expect(themed.filter((name) => !dark.has(name))).toEqual([])
  })

  it('defines every theme-independent token on :root, and not per theme', () => {
    expect(shared.filter((name) => !root.has(name))).toEqual([])
    expect(shared.filter((name) => dark.has(name) || light.has(name))).toEqual([])
  })

  it('overrides every density token in the compact block', () => {
    const density = TOKENS.filter((token) => token.group === 'Density').map((token) => token.name)
    expect(density.filter((name) => !compact.has(name))).toEqual([])
  })

  it('has no CSS variable missing from the manifest', () => {
    const documented = new Set<string>(TOKENS.map((token) => token.name))
    expect([...allVars(blocks)].filter((name) => !documented.has(name))).toEqual([])
  })

  it('has no stray variables in the dark block', () => {
    expect([...dark].filter((name) => !light.has(name))).toEqual([])
  })
})
