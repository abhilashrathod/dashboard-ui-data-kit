import { RotateCcw } from 'lucide-react'
import { Button, Card } from '@/components'
import { useListParams, type ListDefaults } from '@/lib/url-state'
import { ListParamsControls } from './ListParamsControls'

export interface ListParamsDemoProps {
  namespace: string
  title?: string
  defaults?: ListDefaults
}

/**
 * Dev-only: every list-param control wired straight to useListParams. No
 * component state mirrors the URL; each click is one setParams call.
 */
export function ListParamsDemo({ namespace, title = namespace, defaults }: ListParamsDemoProps) {
  const { params, setParams, resetParams, dropped, key } = useListParams(namespace, { defaults })
  return (
    <Card aria-label={`${title} list`} role="region" className="flex flex-col gap-4">
      <Card.Header
        actions={
          <Button variant="ghost" size="sm" leftIcon={<RotateCcw />} onClick={() => resetParams()}>
            Reset
          </Button>
        }
      >
        <Card.Title className="font-mono text-sm">{namespace}.*</Card.Title>
      </Card.Header>

      <ListParamsControls
        params={params}
        setParams={setParams}
        title={title}
        defaultSort={defaults?.sort}
      />

      {dropped.length > 0 && (
        <div role="status" className="rounded-md bg-status-warning-subtle p-3 text-sm text-fg">
          {dropped.length === 1
            ? '1 invalid part was removed from the link:'
            : `${dropped.length} invalid parts were removed from the link:`}
          <ul className="mt-1 list-disc pl-5 font-mono text-xs">
            {dropped.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <pre
        data-testid="params"
        className="rounded-md bg-surface-subtle p-3 font-mono text-xs break-all whitespace-pre-wrap text-fg"
      >
        {JSON.stringify(params, null, 2)}
        {`\n\nkey: "${key}"`}
      </pre>
    </Card>
  )
}
