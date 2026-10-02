import { formatDate, formatTime } from '@/lib/format'

/** "Sep 30, 2026", optionally with the time on a muted second line. */
export function DateCell({ value, showTime = false }: { value: string; showTime?: boolean }) {
  return (
    <span className="flex min-w-0 flex-col tabular">
      <span className="truncate">{formatDate(value, { style: 'medium' })}</span>
      {showTime ? (
        <span className="truncate text-xs text-fg-muted">{formatTime(value)}</span>
      ) : null}
    </span>
  )
}
