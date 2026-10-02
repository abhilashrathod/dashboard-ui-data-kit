import { Amount } from '../../amount'

/** A money cell: tabular digits, no orange glyph (too loud repeated down a column). */
export function AmountCell({ value }: { value: number }) {
  return <Amount value={value} size="sm" glyph={false} />
}
