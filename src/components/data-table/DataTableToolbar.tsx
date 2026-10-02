import { Children, isValidElement, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Toolbar parts take `slot="end"` to sit on the right; the default is the start. */
export type ToolbarSlot = 'start' | 'end'

function DataTableToolbarEnd({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)} {...props} />
}

/**
 * The controls row above the grid: a start area (search, filters) and an end
 * area (density, export). Wraps on small screens, end area under the start.
 * Children go to the end with `slot="end"`, or inside <DataTable.Toolbar.End>.
 */
export function DataTableToolbar({ className, children, ...props }: ComponentProps<'div'>) {
  const start: ReactNode[] = []
  const end: ReactNode[] = []
  for (const child of Children.toArray(children)) {
    const isEnd =
      isValidElement<{ slot?: unknown }>(child) &&
      (child.type === DataTableToolbarEnd || child.props.slot === 'end')
    ;(isEnd ? end : start).push(child)
  }

  return (
    <div
      className={cn('flex flex-wrap items-center justify-between gap-3 px-card', className)}
      {...props}
    >
      <div className="flex min-w-0 flex-[1_1_16rem] flex-wrap items-center gap-2">{start}</div>
      {end.length > 0 ? <div className="flex flex-wrap items-center gap-2">{end}</div> : null}
    </div>
  )
}

DataTableToolbar.End = DataTableToolbarEnd
