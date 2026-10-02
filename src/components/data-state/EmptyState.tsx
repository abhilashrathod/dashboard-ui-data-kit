import { cva } from 'class-variance-authority'
import { Inbox, SearchX } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '../button'

export const emptyStateVariants = cva('flex flex-col items-center justify-center text-center', {
  variants: {
    size: {
      default: 'gap-3 px-6 py-10',
      compact: 'gap-2 px-4 py-5',
    },
  },
  defaultVariants: { size: 'default' },
})

const iconVariants = cva('grid place-items-center rounded-pill', {
  variants: {
    size: { default: 'size-11 [&_svg]:size-5', compact: 'size-8 [&_svg]:size-4' },
    tone: {
      neutral: 'bg-surface-muted text-fg-muted',
      danger: 'bg-status-danger-subtle text-status-danger-fg',
    },
  },
  defaultVariants: { size: 'default', tone: 'neutral' },
})

export type EmptyStateSize = 'default' | 'compact'

export type EmptyStateProps = Omit<ComponentProps<'div'>, 'title'> & {
  /** A lucide icon; rendered decoratively. */
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** A button or link: the next step. */
  action?: ReactNode
  /** 'compact' for KPI cards and small widgets. */
  size?: EmptyStateSize
  /** 'danger' tints the icon (ErrorState uses it). */
  tone?: 'neutral' | 'danger'
}

/** A calm, centered message where content would be. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'default',
  tone = 'neutral',
  className,
  ...props
}: EmptyStateProps) {
  const compact = size === 'compact'
  return (
    <div className={cn(emptyStateVariants({ size }), className)} {...props}>
      {icon ? (
        <span aria-hidden="true" className={iconVariants({ size, tone })}>
          {icon}
        </span>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className={cn('font-medium text-fg', compact ? 'text-sm' : 'text-md')}>{title}</p>
        {description ? (
          <p className={cn('max-w-sm text-fg-muted', compact ? 'text-xs' : 'text-sm')}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex flex-col items-center gap-2">{action}</div> : null}
    </div>
  )
}

/** "No orders yet": the data set itself is empty (nothing to filter). */
export function NoDataEmptyState({
  noun,
  action,
  size,
}: {
  /** Plural, lower case: "orders". */
  noun: string
  action?: ReactNode
  size?: EmptyStateSize
}) {
  return (
    <EmptyState
      icon={<Inbox />}
      title={`No ${noun} yet`}
      description={size === 'compact' ? undefined : `When there are ${noun}, they'll show up here.`}
      action={action}
      size={size}
    />
  )
}

/** "No orders match these filters": data exists, the filters exclude all of it. */
export function NoResultsEmptyState({
  noun,
  onClear,
  size,
}: {
  noun: string
  /** Offers "Clear filters" when given. */
  onClear?: () => void
  size?: EmptyStateSize
}) {
  return (
    <EmptyState
      icon={<SearchX />}
      title={`No ${noun} match these filters`}
      description={size === 'compact' ? undefined : 'Try removing a filter or widening the range.'}
      action={
        onClear ? (
          <Button variant="secondary" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        ) : undefined
      }
      size={size}
    />
  )
}
