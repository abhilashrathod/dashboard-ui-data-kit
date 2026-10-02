import { HttpResponse, type JsonBodyType } from 'msw'
import type { ApiErrorBody, ApiErrorCode } from '@/contracts'
import type { z } from '@/contracts/zod'

let requestCounter = 0

/** "req_000001", "req_000002", … Deterministic, so tests can assert on them. */
export function nextRequestId(): string {
  requestCounter += 1
  return `req_${String(requestCounter).padStart(6, '0')}`
}

/** Called by resetDb(), so each fresh dataset starts again at req_000001. */
export function resetRequestIds(): void {
  requestCounter = 0
}

/** JSON response tagged with an `x-request-id` header. */
export function json<T extends JsonBodyType>(body: T, status = 200) {
  return HttpResponse.json(body, { status, headers: { 'x-request-id': nextRequestId() } })
}

/** ApiErrorBody-shaped error, with the same requestId in the body and the header. */
export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  extras: Pick<ApiErrorBody, 'issues' | 'fieldErrors'> = {},
) {
  const requestId = nextRequestId()
  const body: ApiErrorBody = { status, code, message, requestId, ...extras }
  return HttpResponse.json(body, { status, headers: { 'x-request-id': requestId } })
}

/**
 * Zod issues → { "customer.email": ["Invalid email address"], … }. Dot-path
 * keys map directly onto React Hook Form field names. Issues at the root
 * (e.g. the body isn't an object) have no field, so they're left out here;
 * use zodToIssues for those.
 */
export function zodToFieldErrors(error: z.core.$ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    if (issue.path.length === 0) continue
    const key = issue.path.map(String).join('.')
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  return fieldErrors
}

/** Zod issues → ["customer.email: Invalid email address", …], including root-level ones. */
export function zodToIssues(error: z.core.$ZodError): string[] {
  return error.issues.map((issue) =>
    issue.path.length === 0
      ? issue.message
      : `${issue.path.map(String).join('.')}: ${issue.message}`,
  )
}
