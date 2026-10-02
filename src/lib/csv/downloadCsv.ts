/** Excel needs the UTF-8 byte order mark to read "José" as José rather than mojibake. */
const BOM = '﻿'

/**
 * Save `csv` as a file: BOM + text in a Blob, a temporary <a download>,
 * clicked, removed, and the object URL revoked on the next tick (revoking
 * synchronously can cancel the download in some browsers).
 */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

const pad = (value: number) => String(value).padStart(2, '0')

/** yyyy-mm-dd in the user's LOCAL time zone: the day they'd say they exported it. */
export function localDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export type ExportScope =
  { scope: 'selected'; count: number } | { scope: 'page'; page: number; count?: number }

/** "orders-selected-12-2026-10-02.csv", "orders-page-3-2026-10-02.csv". */
export function exportFilename(tableId: string, scope: ExportScope, date = new Date()): string {
  const part = scope.scope === 'selected' ? `selected-${scope.count}` : `page-${scope.page}`
  return `${tableId}-${part}-${localDate(date)}.csv`
}
