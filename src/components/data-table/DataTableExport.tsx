import type { RowData } from '@tanstack/react-table'
import { ChevronDown, Download } from 'lucide-react'
import { useId } from 'react'
import { downloadCsv, exportFilename, toCsv } from '@/lib/csv'
import { formatNumber } from '@/lib/format'
import { useAnnounce } from '../announcer'
import { Button } from '../button'
import { DropdownMenu } from '../dropdown-menu'
import { useToast } from '../toast'
import { Tooltip } from '../tooltip'
import { VisuallyHidden } from '../visually-hidden'
import { useDataTableContext } from './context'
import type { ToolbarSlot } from './DataTableToolbar'
import { buildCsvColumns, selectedRowsForExport } from './exportColumns'
import { countOf } from './model'

export interface DataTableExportProps {
  slot?: ToolbarSlot
  className?: string
}

/**
 * CSV export of what the user is looking at: the visible columns, raw values.
 * Without a selection, "Export" downloads the current page. With one, it opens
 * a menu: "Export selected (n)" (across pages, from the selection's row
 * snapshots) or "Export this page".
 */
export function DataTableExport({ className }: DataTableExportProps) {
  const { table, label } = useDataTableContext('Export')
  const { toast } = useToast()
  const announce = useAnnounce()
  const reasonId = useId()
  const { dataState, selection } = table
  const noun = label.toLowerCase()

  // Only a settled page: placeholder rows are the previous key's, not what the header says.
  const ready = dataState.status === 'ready' && !dataState.isPlaceholder
  const pageRows = ready ? table.rows : []

  const run = (rows: readonly RowData[], scope: 'selected' | 'page') => {
    const csv = toCsv(rows, buildCsvColumns(table.instance))
    downloadCsv(
      csv,
      exportFilename(
        table.id,
        scope === 'selected' ? { scope, count: rows.length } : { scope, page: table.params.page },
      ),
    )
    const message = `Exported ${countOf(rows.length, label)}`
    toast({ title: message, tone: 'success' })
    announce(message)
  }
  const exportPage = () =>
    run(
      pageRows.map((row) => row.original),
      'page',
    )
  const exportSelected = () => run(selectedRowsForExport(table.rows, selection), 'selected')

  if (pageRows.length === 0 && selection.count === 0) {
    const reason =
      dataState.status === 'empty' || dataState.status === 'no-results'
        ? `There are no ${noun} to export`
        : `Export is available once the ${noun} have loaded`
    // Focusable (aria-disabled, not disabled) so the reason reaches keyboard users too.
    return (
      <>
        <Tooltip content={reason}>
          <Button
            variant="outline"
            leftIcon={<Download />}
            aria-disabled="true"
            data-disabled=""
            aria-describedby={reasonId}
            onClick={(event) => event.preventDefault()}
            className={className}
          >
            Export
          </Button>
        </Tooltip>
        <VisuallyHidden id={reasonId}>{reason}</VisuallyHidden>
      </>
    )
  }

  if (selection.count === 0) {
    return (
      <Button variant="outline" leftIcon={<Download />} onClick={exportPage} className={className}>
        Export
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="outline"
          leftIcon={<Download />}
          rightIcon={<ChevronDown />}
          className={className}
        >
          Export
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Item onSelect={exportSelected}>
          Export selected ({formatNumber(selection.count)})
        </DropdownMenu.Item>
        <DropdownMenu.Item onSelect={exportPage} disabled={pageRows.length === 0}>
          Export this page ({countOf(pageRows.length, 'rows')})
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}
