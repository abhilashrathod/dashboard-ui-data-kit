import { RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, IconButton, Tooltip } from '@/components'

/** Dev-only: the card chrome shared by the demo widgets (title + refresh). */
export function WidgetCard({
  title,
  onRefresh,
  actions,
  className,
  children,
}: {
  title: string
  onRefresh: () => unknown
  actions?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={className}>
      <Card.Header
        actions={
          <>
            {actions}
            <Tooltip content={`Refresh ${title.toLowerCase()}`}>
              <IconButton
                variant="ghost"
                size="sm"
                aria-label={`Refresh ${title.toLowerCase()}`}
                onClick={() => void onRefresh()}
              >
                <RefreshCw />
              </IconButton>
            </Tooltip>
          </>
        }
      >
        <Card.Title className="text-sm font-medium text-fg-muted">{title}</Card.Title>
      </Card.Header>
      {children}
    </Card>
  )
}
