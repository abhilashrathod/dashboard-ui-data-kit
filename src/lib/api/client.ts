import { ApiErrorBody } from '@/contracts'
import * as z from '@/contracts/zod'
import { ApiError } from './errors'

export interface ApiFetchOptions<S extends z.ZodMiniType> {
  /** Contract for a 2xx body. The resolved value is typed from it. */
  schema: S
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  /** Sent as JSON. */
  body?: unknown
  signal?: AbortSignal
}

/**
 * Cancellation must surface as the original rejection. TanStack Query aborts
 * the signal when a query is cancelled or superseded and expects the AbortError
 * back; converting it to an ApiError would show users a fake error for a
 * request nobody is waiting on anymore.
 */
function isCancellation(error: unknown, signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true || (error instanceof Error && error.name === 'AbortError')
}

function formatIssues(error: z.core.$ZodError): string[] {
  return error.issues.map((issue) =>
    issue.path.length === 0
      ? issue.message
      : `${issue.path.map(String).join('.')}: ${issue.message}`,
  )
}

/** Turns a non-2xx response into an ApiError, using the ApiErrorBody when the server sent one. */
async function toApiError(response: Response, signal: AbortSignal | undefined): Promise<ApiError> {
  let body: unknown
  try {
    body = JSON.parse(await response.text())
  } catch (error) {
    if (isCancellation(error, signal)) throw error
    body = undefined // not JSON, e.g. an HTML 404 page from the host
  }

  const parsed = ApiErrorBody.safeParse(body)
  if (parsed.success) return new ApiError(parsed.data)
  return new ApiError({
    status: response.status,
    code: 'SERVER_ERROR',
    message: `Unexpected ${response.status} response`,
  })
}

/**
 * The one way the app talks to the API. Resolves with the contract-validated
 * body, rejects with an ApiError, or (when cancelled) with the AbortError.
 */
export async function apiFetch<S extends z.ZodMiniType>(
  path: string,
  { schema, method = 'GET', body, signal }: ApiFetchOptions<S>,
): Promise<z.infer<S>> {
  // Resolved against the page origin: Node's fetch (tests) rejects relative URLs.
  const url = new URL(path, window.location.origin)
  const headers = new Headers({ Accept: 'application/json' })
  if (body !== undefined) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    // Rethrow cancellation UNCHANGED (see isCancellation).
    if (isCancellation(error, signal)) throw error
    throw new ApiError({ status: 0, code: 'UNAVAILABLE', message: 'Network error', cause: error })
  }

  if (!response.ok) throw await toApiError(response, signal)

  let data: unknown
  try {
    data = await response.json()
  } catch (error) {
    // The body is still streaming after headers arrive, so an abort can land here too.
    if (isCancellation(error, signal)) throw error
    data = undefined // not JSON: reported as a contract mismatch below
  }

  const parsed = z.safeParse(schema, data)
  if (!parsed.success) {
    const issues = formatIssues(parsed.error)
    console.error(`[api] ${method} ${path} did not match its contract`, issues)
    throw new ApiError({
      status: response.status,
      code: 'CONTRACT',
      message: 'Response did not match contract',
      requestId: response.headers.get('x-request-id') ?? undefined,
      issues,
    })
  }
  return parsed.data
}
