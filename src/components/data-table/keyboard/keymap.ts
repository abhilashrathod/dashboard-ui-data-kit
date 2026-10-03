import { modifierLabel } from './platform'

/*
 * The grid's keyboard map, as data. ONE source for two outputs:
 *  - DataTable.KeyboardHelp (the "?" dialog), with the platform's modifier;
 *  - the keymap table in docs/keyboard-grid.md, which is GENERATED from
 *    keymapMarkdown() between its keymap markers. keymap.node.test.ts fails
 *    when they drift; `pnpm docs:keymap` rewrites the doc's table.
 *
 * The behavior lives in gridNav / interaction / useGridKeyboard; this file
 * only describes it. Add a row here when you add a key there.
 */

export const KEYMAP_GROUPS = ['Navigation', 'Selection', 'Cells & actions'] as const
export type KeymapGroup = (typeof KEYMAP_GROUPS)[number]

/**
 * Key tokens: 'Mod' is ⌘ on Apple platforms and Ctrl elsewhere; other tokens
 * are KeyboardEvent.key values ('ArrowUp', 'Home', ' ' as 'Space', '?').
 */
export interface KeyCombo {
  keys: readonly string[]
  /** Only shown on that platform (e.g. ⌘↑, a Mac alias for Ctrl+Home). */
  platform?: 'apple'
}

export interface KeymapEntry {
  id: string
  group: KeymapGroup
  /** Alternatives: any one of them does it. */
  combos: readonly KeyCombo[]
  description: string
}

const keys = (...tokens: string[]): KeyCombo => ({ keys: tokens })
const apple = (...tokens: string[]): KeyCombo => ({ keys: tokens, platform: 'apple' })

export const KEYMAP: readonly KeymapEntry[] = [
  // Navigation
  {
    id: 'tab',
    group: 'Navigation',
    combos: [keys('Tab'), keys('Shift', 'Tab')],
    description:
      'Move into or out of the table: it is one Tab stop, and you come back to the same cell',
  },
  {
    id: 'columns',
    group: 'Navigation',
    combos: [keys('ArrowLeft'), keys('ArrowRight')],
    description: 'Previous or next column (stops at the edges)',
  },
  {
    id: 'rows',
    group: 'Navigation',
    combos: [keys('ArrowUp'), keys('ArrowDown')],
    description: 'Previous or next row; up from the first row reaches the column headers',
  },
  {
    id: 'row-ends',
    group: 'Navigation',
    combos: [keys('Home'), keys('End')],
    description: 'First or last cell in the row',
  },
  {
    id: 'grid-start',
    group: 'Navigation',
    combos: [keys('Mod', 'Home'), apple('Mod', 'ArrowUp')],
    description: 'First cell of the first row',
  },
  {
    id: 'grid-end',
    group: 'Navigation',
    combos: [keys('Mod', 'End'), apple('Mod', 'ArrowDown')],
    description: 'Last cell of the last row',
  },
  {
    id: 'pages',
    group: 'Navigation',
    combos: [keys('PageUp'), keys('PageDown')],
    description: 'Up or down 10 rows',
  },
  // Selection
  {
    id: 'select-row',
    group: 'Selection',
    combos: [keys('Space')],
    description: 'Select or deselect the row',
  },
  {
    id: 'select-range',
    group: 'Selection',
    combos: [keys('Shift', 'Space')],
    description: 'Apply the same to every row from the last one you selected',
  },
  {
    id: 'select-page',
    group: 'Selection',
    combos: [keys('Mod', 'A')],
    description: 'Select every row on this page; again to deselect them',
  },
  // Cells & actions
  {
    id: 'sort',
    group: 'Cells & actions',
    combos: [keys('Enter'), keys('Space')],
    description: 'On a column header: sort by that column',
  },
  {
    id: 'open-row',
    group: 'Cells & actions',
    combos: [keys('Enter')],
    description: "On a text cell: open the row's details",
  },
  {
    id: 'interact',
    group: 'Cells & actions',
    combos: [keys('Enter'), keys('F2')],
    description: 'On a cell with several controls (Customer): interact with them',
  },
  {
    id: 'interact-tab',
    group: 'Cells & actions',
    combos: [keys('Tab'), keys('Shift', 'Tab')],
    description: 'While interacting: next or previous control in the cell (wraps around)',
  },
  {
    id: 'interact-exit',
    group: 'Cells & actions',
    combos: [keys('Escape'), keys('F2')],
    description: 'While interacting: back to the cell',
  },
  {
    id: 'help',
    group: 'Cells & actions',
    combos: [keys('?')],
    description: 'Show these keyboard shortcuts',
  },
]

const KEY_LABELS: Record<string, { apple?: string; other: string }> = {
  Shift: { apple: '⇧', other: 'Shift' },
  ArrowUp: { other: '↑' },
  ArrowDown: { other: '↓' },
  ArrowLeft: { other: '←' },
  ArrowRight: { other: '→' },
  PageUp: { other: 'Page Up' },
  PageDown: { other: 'Page Down' },
  Escape: { other: 'Esc' },
}

/** One key's label: "Mod" → "⌘" / "Ctrl", "ArrowUp" → "↑", "Shift" → "⇧" on a Mac. */
export function keyLabel(token: string, isApple: boolean): string {
  if (token === 'Mod') return modifierLabel(isApple)
  const label = KEY_LABELS[token]
  return label ? (isApple && label.apple) || label.other : token
}

/** The combos shown on a platform: everything, minus other platforms' aliases. */
export function combosFor(entry: KeymapEntry, isApple: boolean): KeyCombo[] {
  return entry.combos.filter((combo) => combo.platform !== 'apple' || isApple)
}

/** "Ctrl+Home", "⌘↑" (Mac style joins without "+"), "⇧Space". */
export function comboLabel(combo: KeyCombo, isApple: boolean): string {
  return combo.keys.map((token) => keyLabel(token, isApple)).join(isApple ? '' : '+')
}

const SYNONYMS: Record<string, string> = { Space: ' ' }

/** The KeyboardEvent.key for a token, for tests that press what the keymap says. */
export function eventKeyOf(token: string): string {
  return SYNONYMS[token] ?? token
}

/**
 * The docs table (docs/keyboard-grid.md), platform-neutral: the Ctrl form,
 * then the Mac forms where they differ ("Ctrl+Home · Mac: ⌘Home, ⌘↑").
 */
export function keymapMarkdown(): string {
  const rows = KEYMAP.map((entry) => {
    const other = combosFor(entry, false).map((combo) => comboLabel(combo, false))
    const mac = combosFor(entry, true).map((combo) => comboLabel(combo, true))
    const differs = entry.combos.some(
      (combo) => combo.platform === 'apple' || combo.keys.includes('Mod'),
    )
    const keysCell = other.join(' / ') + (differs ? ` · Mac: ${mac.join(' / ')}` : '')
    return { group: entry.group, keys: keysCell, description: entry.description }
  })
  const lines = ['| Group | Keys | Action |', '| --- | --- | --- |']
  for (const row of rows) {
    lines.push(`| ${row.group} | ${row.keys.replaceAll('|', '\\|')} | ${row.description} |`)
  }
  return lines.join('\n')
}

export const KEYMAP_DOC_START = '<!-- keymap:start (generated from keymap.ts: pnpm docs:keymap) -->'
export const KEYMAP_DOC_END = '<!-- keymap:end -->'
