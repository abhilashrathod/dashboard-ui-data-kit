import * as z from './zod'

/** Paginated list envelope, e.g. `pageSchema(Order)`. Pages are 1-based. */
export function pageSchema<T extends z.ZodMiniType>(itemSchema: T) {
  return z.object({
    rows: z.array(itemSchema),
    total: z.int().check(z.gte(0)),
    page: z.int().check(z.gte(1)),
    pageSize: z.int().check(z.gte(1)),
  })
}
export type Page<T> = { rows: T[]; total: number; page: number; pageSize: number }

export const ApiErrorCode = z.enum([
  'BAD_REQUEST',
  'VALIDATION',
  'NOT_FOUND',
  'SERVER_ERROR',
  'UNAVAILABLE',
])
export type ApiErrorCode = z.infer<typeof ApiErrorCode>

export const ApiErrorBody = z.object({
  status: z.int(),
  code: ApiErrorCode,
  message: z.string(),
  requestId: z.string(),
  issues: z.optional(z.array(z.string())),
  /**
   * Keyed by dot-path (e.g. "customer.email") so entries map directly onto
   * React Hook Form field names.
   */
  fieldErrors: z.optional(z.record(z.string(), z.array(z.string()))),
})
export type ApiErrorBody = z.infer<typeof ApiErrorBody>
