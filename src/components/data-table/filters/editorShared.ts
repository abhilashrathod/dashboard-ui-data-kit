import type { Filter, ListParams } from '@/contracts'
import { cn } from '@/lib/cn'
import type { FilterableColumn } from './filterModel'

export interface FilterEditorProps {
  column: FilterableColumn
  /** The active filter on this column's field, if any. */
  filter: Filter | undefined
  /** A URL update (push); the page resets on its own (applyParamsUpdate). */
  apply: (updater: (prev: ListParams) => ListParams) => void
  /** Close the popover; focus returns to the pill. */
  close: () => void
  /** The id of the editor's heading, which names the popover. */
  headingId: string
}

/** Small text actions ("Select all", "Clear"): link-styled buttons. */
export const linkButtonClass = cn(
  'rounded-xs text-sm font-medium text-accent-text underline-offset-2 focus-ring',
  'hover-enabled:underline disabled:cursor-not-allowed disabled:opacity-50',
)

export const headingClass = 'text-sm font-semibold'
export const errorClass = 'text-xs text-status-danger-fg'
