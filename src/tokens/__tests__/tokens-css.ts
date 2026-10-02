import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/*
 * Minimal tokens.css reader for the guard tests. It only needs to handle the
 * shapes tokens.css uses: flat rule blocks with custom properties, optionally
 * inside one level of @media.
 */

export interface CssBlock {
  selectors: string[]
  /** The enclosing at-rule prelude, e.g. "@media (prefers-reduced-motion: reduce)". */
  atRule: string | null
  vars: Map<string, string>
}

export const LIGHT = "[data-theme='light']"
export const DARK = "[data-theme='dark']"
export const COMPACT = "[data-density='compact']"

export function parseCssBlocks(css: string, atRule: string | null = null): CssBlock[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const blocks: CssBlock[] = []
  let preludeStart = 0
  let i = 0
  while (i < source.length) {
    if (source[i] !== '{') {
      i += 1
      continue
    }
    const prelude = source.slice(preludeStart, i).trim()
    let depth = 1
    let j = i + 1
    while (j < source.length && depth > 0) {
      if (source[j] === '{') depth += 1
      if (source[j] === '}') depth -= 1
      j += 1
    }
    const body = source.slice(i + 1, j - 1)
    if (prelude.startsWith('@')) {
      blocks.push(...parseCssBlocks(body, prelude))
    } else {
      const vars = new Map<string, string>()
      for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) {
        vars.set(match[1]!, match[2]!.replace(/\s+/g, ' ').trim())
      }
      blocks.push({
        selectors: prelude.split(',').map((s) => s.trim().replaceAll('"', "'")),
        atRule,
        vars,
      })
    }
    i = j
    preludeStart = j
  }
  return blocks
}

export function readTokensCss(): CssBlock[] {
  const path = fileURLToPath(new URL('../tokens.css', import.meta.url))
  return parseCssBlocks(readFileSync(path, 'utf8'))
}

/** Names declared in unconditional blocks matching `selector`. */
export function varsFor(blocks: CssBlock[], selector: string): Set<string> {
  const names = new Set<string>()
  for (const block of blocks) {
    if (block.atRule === null && block.selectors.includes(selector)) {
      for (const name of block.vars.keys()) names.add(name)
    }
  }
  return names
}

export function allVars(blocks: CssBlock[]): Set<string> {
  return new Set(blocks.flatMap((block) => [...block.vars.keys()]))
}

/**
 * Every custom property's value in a theme, with var() references resolved:
 * :root first, then the dark block on top for 'dark'.
 */
export function resolveTheme(blocks: CssBlock[], theme: 'light' | 'dark'): Map<string, string> {
  const raw = new Map<string, string>()
  const apply = (selector: string) => {
    for (const block of blocks) {
      if (block.atRule === null && block.selectors.includes(selector)) {
        for (const [name, value] of block.vars) raw.set(name, value)
      }
    }
  }
  apply(':root')
  if (theme === 'dark') apply(DARK)

  const resolve = (value: string, seen: Set<string>): string =>
    value.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
      if (seen.has(name)) throw new Error(`Cyclic token reference: ${name}`)
      const target = raw.get(name)
      if (target === undefined) throw new Error(`Undefined token reference: ${name}`)
      return resolve(target, new Set([...seen, name]))
    })

  return new Map([...raw].map(([name, value]) => [name, resolve(value, new Set([name]))]))
}
