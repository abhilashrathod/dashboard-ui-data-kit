/*
 * Tone pairs already tested for contrast (badges use the same ones). Danger is
 * left out on purpose: a red avatar reads as "something is wrong with this customer".
 */
export const AVATAR_TONES = [
  'bg-accent-subtle text-accent-subtle-fg',
  'bg-status-success-subtle text-status-success-fg',
  'bg-status-info-subtle text-status-info-fg',
  'bg-status-warning-subtle text-status-warning-fg',
  'bg-status-neutral-subtle text-status-neutral-fg',
  'bg-surface-muted text-fg',
] as const

/** FNV-1a: small, fast, and spreads similar names ("Ana", "Ann") apart. */
function hash(text: string): number {
  let value = 0x811c9dc5
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x01000193)
  }
  return value >>> 0
}

/** The palette entry for a name. Same name, same tone, on every render and machine. */
export function avatarToneIndex(name: string): number {
  return hash(name.trim().toLowerCase()) % AVATAR_TONES.length
}

/** "Ada" → "A", "Ada Lovelace" → "AL", "Mary Ann Smith" → "MS" (first and last word). */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]
  if (!first) return ''
  const last = words.length > 1 ? words[words.length - 1] : undefined
  const letter = (word: string) => [...word][0]?.toUpperCase() ?? ''
  return letter(first) + (last ? letter(last) : '')
}
