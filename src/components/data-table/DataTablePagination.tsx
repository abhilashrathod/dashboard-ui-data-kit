import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import { setPage, setPageSize } from '@/lib/url-state'
import { IconButton } from '../icon-button'
import { Select } from '../select'
import { useDataTableContext } from './context'
import { PAGE_SIZE_OPTIONS, pageRange } from './model'

export interface DataTablePaginationProps {
  pageSizes?: readonly number[]
  className?: string
}

/**
 * "Showing 51–100 of 4,213", a page size select, "Page 2 of 85" and prev/next.
 * Every change is a URL push (Back undoes it). Hidden when there's nothing to
 * page through (empty, no results, error, or nothing loaded yet); during a
 * placeholder transition it keeps showing the last known numbers.
 */
export function DataTablePagination({
  pageSizes = PAGE_SIZE_OPTIONS,
  className,
}: DataTablePaginationProps) {
  const { table } = useDataTableContext('Pagination')
  const { params, setParams, dataState, total } = table
  const sizeLabelId = useId()

  const hidden =
    dataState.status === 'empty' ||
    dataState.status === 'no-results' ||
    dataState.status === 'error' ||
    (dataState.status === 'loading' && total === 0)
  if (hidden) return null

  const { from, to, pageCount } = pageRange({
    page: params.page,
    pageSize: params.pageSize,
    total,
  })
  const page = params.page
  const sizes = pageSizes.includes(params.pageSize)
    ? pageSizes
    : [...pageSizes, params.pageSize].sort((a, b) => a - b)

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-card text-sm text-fg-muted tabular',
        className,
      )}
    >
      <p data-testid="data-table-range">
        Showing <span className="text-fg">{formatNumber(from)}</span>–
        <span className="text-fg">{formatNumber(to)}</span> of{' '}
        <span className="text-fg">{formatNumber(total)}</span>
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span id={sizeLabelId}>Rows per page</span>
          <Select
            size="sm"
            aria-labelledby={sizeLabelId}
            value={String(params.pageSize)}
            onValueChange={(value) => setParams(setPageSize(Number(value)))}
            options={sizes.map((size) => ({ value: String(size), label: String(size) }))}
            className="w-20"
          />
        </div>
        <p>
          Page <span className="text-fg">{formatNumber(page)}</span> of{' '}
          <span className="text-fg">{formatNumber(Math.max(pageCount, 1))}</span>
        </p>
        <div className="flex items-center gap-1">
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => setParams(setPage(page - 1))}
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => setParams(setPage(page + 1))}
          >
            <ChevronRight />
          </IconButton>
        </div>
      </div>
    </div>
  )
}
