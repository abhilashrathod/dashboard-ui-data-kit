import { Columns3, RotateCcw } from 'lucide-react'
import { useAnnounce } from '../announcer'
import { Button } from '../button'
import { DropdownMenu } from '../dropdown-menu'
import { useDataTableContext } from './context'
import type { ToolbarSlot } from './DataTableToolbar'
import { columnIdOf, type ColumnLike } from './model'
import { SELECTION_COLUMN_ID } from './selectionColumn'

export interface DataTableColumnToggleProps {
  slot?: ToolbarSlot
  className?: string
}

/**
 * "Columns": a menu with one checkbox per data column, labelled from
 * meta.label. Toggling keeps the menu open, so several columns can be changed
 * in one go. Non-hideable columns, and the last visible one, show disabled.
 */
export function DataTableColumnToggle({ className }: DataTableColumnToggleProps) {
  const { table } = useDataTableContext('ColumnToggle')
  const { columnVisibility } = table
  const announce = useAnnounce()
  const columns = (table.columns as readonly ColumnLike[]).filter(
    (column) => columnIdOf(column) !== SELECTION_COLUMN_ID,
  )

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" leftIcon={<Columns3 />} className={className}>
          Columns
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Label>Show columns</DropdownMenu.Label>
        {columns.map((column) => {
          const id = columnIdOf(column)!
          const label = column.meta?.label ?? id
          const visible = columnVisibility.isVisible(id)
          return (
            <DropdownMenu.CheckboxItem
              key={id}
              checked={visible}
              // Checked and disabled: always shown (meta.hideable false), or the last one left.
              disabled={visible && !columnVisibility.canHide(id)}
              onCheckedChange={(checked) => {
                columnVisibility.setVisible(id, checked)
                announce(`${label} column ${checked ? 'shown' : 'hidden'}`)
              }}
              // Keep the menu open: toggling several columns is the common case.
              onSelect={(event) => event.preventDefault()}
            >
              {label}
            </DropdownMenu.CheckboxItem>
          )
        })}
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          icon={<RotateCcw />}
          onSelect={() => {
            columnVisibility.reset()
            announce('Columns reset to default')
          }}
        >
          Reset to default
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}
