import type { ApiErrorBody } from '@/contracts'

/**
 * An ApiErrorBody code from the server, or 'CONTRACT' when a 2xx response
 * didn't match its schema (client-side; the server never sends it).
 */
export type ApiErrorCode = ApiErrorBody['code'] | 'CONTRACT'

export interface ApiErrorInit {
  status: number
  code: ApiErrorCode
  message: string
  requestId?: string
  issues?: string[]
  fieldErrors?: Record<string, string[]>
  cause?: unknown
}

/**
 * Every failure the API client reports, apart from cancellation (an aborted
 * request rejects with the original AbortError; see client.ts).
 * `status` is 0 when no HTTP response arrived at all.
 */
export class ApiError extends Error {
  override readonly name = 'ApiError'
  readonly status: number
  readonly code: ApiErrorCode
  readonly requestId?: string
  readonly issues?: string[]
  /** Dot-path keys ("customer.email"), matching React Hook Form field names. */
  readonly fieldErrors?: Record<string, string[]>

  constructor({ status, code, message, requestId, issues, fieldErrors, cause }: ApiErrorInit) {
    super(message, { cause })
    this.status = status
    this.code = code
    this.requestId = requestId
    this.issues = issues
    this.fieldErrors = fieldErrors
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
