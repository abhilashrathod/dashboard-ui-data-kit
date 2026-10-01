export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * GET a JSON resource from the (mocked) API.
 *
 * Paths are resolved against the page origin so the same call works in the
 * browser and under Node's fetch in tests, which rejects relative URLs.
 */
export async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, window.location.origin)
  const headers = new Headers(init?.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  const response = await fetch(url, { ...init, headers })
  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} failed with ${response.status}`)
  }
  return (await response.json()) as T
}
