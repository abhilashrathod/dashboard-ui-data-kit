import { readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  comboLabel,
  combosFor,
  KEYMAP,
  KEYMAP_DOC_END,
  KEYMAP_DOC_START,
  KEYMAP_GROUPS,
  keymapMarkdown,
} from '../keymap'
import { isApplePlatform, modifierLabel } from '../platform'

const DOC = new URL('../../../../../docs/keyboard-grid.md', import.meta.url)

describe('KEYMAP', () => {
  it.each(KEYMAP.map((entry) => [entry.id, entry] as const))(
    '%s has keys, a description and a known group',
    (_, entry) => {
      expect(entry.combos.length).toBeGreaterThan(0)
      for (const combo of entry.combos) expect(combo.keys.length).toBeGreaterThan(0)
      expect(entry.description.trim()).not.toBe('')
      expect(KEYMAP_GROUPS).toContain(entry.group)
    },
  )

  it('has unique ids, and every group has entries', () => {
    expect(new Set(KEYMAP.map((entry) => entry.id)).size).toBe(KEYMAP.length)
    for (const group of KEYMAP_GROUPS) {
      expect(KEYMAP.some((entry) => entry.group === group)).toBe(true)
    }
  })

  it('shows ⌘ on a Mac and Ctrl elsewhere; Mac-only aliases only on a Mac', () => {
    const gridEnd = KEYMAP.find((entry) => entry.id === 'grid-end')!
    expect(combosFor(gridEnd, false).map((combo) => comboLabel(combo, false))).toEqual(['Ctrl+End'])
    expect(combosFor(gridEnd, true).map((combo) => comboLabel(combo, true))).toEqual(['⌘End', '⌘↓'])
    const range = KEYMAP.find((entry) => entry.id === 'select-range')!
    expect(comboLabel(range.combos[0]!, true)).toBe('⇧Space')
    expect(comboLabel(range.combos[0]!, false)).toBe('Shift+Space')
  })
})

/*
 * docs/keyboard-grid.md's keymap table is generated from KEYMAP (the help
 * dialog's data), between two markers. This fails when they drift; run
 * `pnpm docs:keymap` to rewrite the table (UPDATE_KEYMAP_DOCS=1).
 */
describe('docs/keyboard-grid.md keymap table', () => {
  it('matches keymapMarkdown()', () => {
    const doc = readFileSync(DOC, 'utf8')
    const start = doc.indexOf(KEYMAP_DOC_START)
    const end = doc.indexOf(KEYMAP_DOC_END)
    expect(start, 'keymap start marker').toBeGreaterThan(-1)
    expect(end, 'keymap end marker').toBeGreaterThan(start)

    const generated = `${KEYMAP_DOC_START}\n${keymapMarkdown()}\n`
    const current = doc.slice(start, end)
    if (process.env.UPDATE_KEYMAP_DOCS && current !== generated) {
      writeFileSync(DOC, doc.slice(0, start) + generated + doc.slice(end))
      return
    }
    expect(current, 'run `pnpm docs:keymap` to regenerate the table').toBe(generated)
  })
})

describe('platform', () => {
  it.each([
    [{ platform: 'MacIntel' }, true],
    [{ platform: 'iPhone' }, true],
    [{ userAgentData: { platform: 'macOS' }, platform: 'Win32' }, true],
    [{ platform: 'Win32' }, false],
    [{ platform: 'Linux x86_64' }, false],
    [{ userAgentData: { platform: 'Windows' } }, false],
    [{ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)' }, true],
    [{}, false],
  ])('%o → apple: %s', (info, expected) => {
    expect(isApplePlatform(info)).toBe(expected)
  })

  it('names the modifier', () => {
    expect(modifierLabel(true)).toBe('⌘')
    expect(modifierLabel(false)).toBe('Ctrl')
  })
})
