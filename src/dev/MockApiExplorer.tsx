import { useRef, useState } from 'react'
import { DEFAULT_LIST_PARAMS, listParamsKey } from '@/contracts'

/*
 * Dev-only tool for poking the mock API by hand. Not part of the kit.
 *
 * Uses raw fetch rather than the API client on purpose: a dev tool should show
 * the HTTP-level truth (status and x-request-id even on success, error bodies
 * as sent), which the client deliberately hides behind typed results.
 */

interface Call {
  label: string
  method: 'GET' | 'POST' | 'PATCH'
  path: string
  body?: unknown
}

interface CallResult {
  id: number
  call: Call
  status: number | 'network error'
  code?: string
  ms: number
  requestId: string | null
  preview: unknown
}

const paidOver500 = listParamsKey({
  ...DEFAULT_LIST_PARAMS,
  sort: '-amount',
  filters: [
    { field: 'status', op: 'in', value: ['paid'] },
    { field: 'amount', op: 'gt', value: 500 },
  ],
})

/** A fresh reference per click, so "Create (valid)" doesn't trip the uniqueness rule. */
function randomReference(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return `PO-${Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')}`
}

const CALLS: (() => Call)[] = [
  () => ({ label: 'List orders', method: 'GET', path: '/api/orders' }),
  () => ({
    label: 'List paid > $500 sorted by amount',
    method: 'GET',
    path: `/api/orders?${paidOver500}`,
  }),
  () => ({ label: 'KPIs 30d', method: 'GET', path: '/api/metrics/kpis?range=30d' }),
  () => ({ label: 'Revenue 30d', method: 'GET', path: '/api/metrics/revenue?range=30d' }),
  () => ({
    label: 'Create (valid)',
    method: 'POST',
    path: '/api/orders',
    body: {
      customer: { name: 'Dev Explorer', email: 'dev@example.com' },
      channel: 'web',
      amount: 42.5,
      itemCount: 2,
      reference: randomReference(),
    },
  }),
  () => ({
    label: 'Create (invalid)',
    method: 'POST',
    path: '/api/orders',
    body: {
      customer: { name: 'D', email: 'not-an-email' },
      channel: 'fax',
      amount: 0,
      itemCount: 1,
      reference: 'nope',
    },
  }),
  () => ({
    label: 'Bulk mixed',
    method: 'PATCH',
    path: '/api/orders/bulk-status',
    // Seeded orders in mixed states, an unknown id, and a duplicate.
    body: {
      ids: ['ORD-000001', 'ORD-000002', 'ORD-000003', 'ORD-999999', 'ORD-000001'],
      status: 'shipped',
    },
  }),
]

/** First 3 rows/items of a success body, or the whole error body. */
function previewOf(ok: boolean, body: unknown): unknown {
  if (!ok || typeof body !== 'object' || body === null) return body
  const record = body as Record<string, unknown>
  for (const key of ['rows', 'kpis', 'points']) {
    const list = record[key]
    if (Array.isArray(list)) return { ...record, [key]: list.slice(0, 3) }
  }
  if (Array.isArray(record.updated)) return { ...record, updated: record.updated.slice(0, 3) }
  return body
}

async function run(call: Call, id: number): Promise<CallResult> {
  const start = performance.now()
  try {
    const response = await fetch(call.path, {
      method: call.method,
      headers: call.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: call.body === undefined ? undefined : JSON.stringify(call.body),
    })
    const text = await response.text()
    let body: unknown = text
    try {
      body = JSON.parse(text)
    } catch {
      // keep the raw text
    }
    const code =
      !response.ok && typeof body === 'object' && body !== null && 'code' in body
        ? String(body.code)
        : undefined
    return {
      id,
      call,
      status: response.status,
      code,
      ms: Math.round(performance.now() - start),
      requestId: response.headers.get('x-request-id'),
      preview: previewOf(response.ok, body),
    }
  } catch (error) {
    return {
      id,
      call,
      status: 'network error',
      ms: Math.round(performance.now() - start),
      requestId: null,
      preview: String(error),
    }
  }
}

const buttonClass =
  'rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg-default shadow-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none disabled:opacity-60'

export function MockApiExplorer() {
  const [results, setResults] = useState<CallResult[]>([])
  const [pending, setPending] = useState(0)
  const nextId = useRef(0)

  async function handle(makeCall: () => Call) {
    const call = makeCall()
    setPending((n) => n + 1)
    nextId.current += 1
    const result = await run(call, nextId.current)
    setPending((n) => n - 1)
    setResults((previous) => [result, ...previous].slice(0, 10))
  }

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Mock API explorer</h1>
        <p className="text-sm text-fg-muted">
          Dev tool: calls the MSW API directly. Use the Network toolbar to simulate failures.
          {pending > 0 ? ` (${pending} in flight…)` : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CALLS.map((makeCall) => {
          const { label } = makeCall()
          return (
            <button
              key={label}
              type="button"
              className={buttonClass}
              onClick={() => void handle(makeCall)}
            >
              {label}
            </button>
          )
        })}
      </div>

      <ol className="flex flex-col gap-3" aria-label="Responses, newest first">
        {results.map((result) => {
          const ok = typeof result.status === 'number' && result.status < 400
          return (
            <li
              key={result.id}
              className="rounded-lg border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold">{result.call.label}</span>
                <span className={ok ? 'font-mono text-success' : 'font-mono text-danger'}>
                  {result.status}
                </span>
                {result.code ? <span className="font-mono text-danger">{result.code}</span> : null}
                <span className="text-fg-muted">{result.ms} ms</span>
                <span className="font-mono text-fg-muted">
                  {result.requestId ?? 'no request id'}
                </span>
              </div>
              <p className="font-mono mt-1 text-xs break-all text-fg-muted">
                {result.call.method} {result.call.path}
              </p>
              <pre className="mt-2 rounded-md bg-muted p-3 text-xs break-all whitespace-pre-wrap text-fg-default">
                {JSON.stringify(result.preview, null, 2)}
              </pre>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
