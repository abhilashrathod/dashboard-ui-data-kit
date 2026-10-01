/**
 * Absolute URL for an API path. Node's fetch (used under jsdom) rejects
 * relative URLs, so tests call `fetch(api('/api/orders'))`.
 */
export function api(path: string): string {
  return new URL(path, window.location.origin).toString()
}
