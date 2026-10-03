import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form'
import { isApiError } from '@/lib/api'

/**
 * Maps a 422 VALIDATION ApiError onto the form: each `fieldErrors` dot-path
 * ("customer.email") is already a React Hook Form field name, so it becomes
 * setError(path, { type: 'server' }) with the server's first message. The
 * first field gets focus. Returns true when it handled the error; anything
 * else (no fieldErrors, other codes) returns false for a form-level error.
 */
export function applyServerErrors<TValues extends FieldValues, TOutput>(
  form: Pick<UseFormReturn<TValues, unknown, TOutput>, 'setError' | 'setFocus'>,
  error: unknown,
): boolean {
  if (!isApiError(error) || error.code !== 'VALIDATION' || !error.fieldErrors) return false
  const entries = Object.entries(error.fieldErrors).filter(([, messages]) => messages.length > 0)
  if (entries.length === 0) return false

  entries.forEach(([path, messages], index) => {
    const name = path as FieldPath<TValues>
    form.setError(name, { type: 'server', message: messages[0] }, { shouldFocus: index === 0 })
  })
  const [firstPath] = entries[0]!
  form.setFocus(firstPath as FieldPath<TValues>)
  return true
}
