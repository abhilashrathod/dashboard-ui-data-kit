/*
 * Toast state, kept outside React so it can be tested (and called) as plain
 * functions. The ToastProvider subscribes to it with useSyncExternalStore.
 */

export type ToastTone = 'default' | 'success' | 'danger'

export interface ToastOptions {
  title: string
  description?: string
  tone?: ToastTone
  /** One action, e.g. Undo. Keep it reversible; it's easy to miss. */
  action?: { label: string; onClick: () => void }
  /** Milliseconds. Defaults: 5000, or 8000 for danger. */
  duration?: number
}

export interface ToastRecord extends Required<Pick<ToastOptions, 'title' | 'tone' | 'duration'>> {
  id: string
  description?: string
  action?: ToastOptions['action']
  /** False while the exit animation plays; the record is pruned on the next add. */
  open: boolean
}

export const MAX_VISIBLE_TOASTS = 3
export const DEFAULT_DURATION = 5000
export const DANGER_DURATION = 8000

export interface ToastStore {
  add: (options: ToastOptions) => string
  dismiss: (id: string) => void
  getSnapshot: () => ToastRecord[]
  subscribe: (listener: () => void) => () => void
}

export function createToastStore({ max = MAX_VISIBLE_TOASTS } = {}): ToastStore {
  let toasts: ToastRecord[] = []
  let counter = 0
  const listeners = new Set<() => void>()

  const set = (next: ToastRecord[]) => {
    toasts = next
    for (const listener of listeners) listener()
  }

  return {
    add(options) {
      counter += 1
      const id = `toast-${counter}`
      const tone = options.tone ?? 'default'
      const record: ToastRecord = {
        id,
        title: options.title,
        description: options.description,
        action: options.action,
        tone,
        duration: options.duration ?? (tone === 'danger' ? DANGER_DURATION : DEFAULT_DURATION),
        open: true,
      }
      // Drop toasts that already closed (their exit animation is long done),
      // then close the oldest open ones beyond the limit.
      const next = [...toasts.filter((toast) => toast.open), record]
      const excess = next.length - max
      set(next.map((toast, index) => (index < excess ? { ...toast, open: false } : toast)))
      return id
    },

    dismiss(id) {
      if (!toasts.some((toast) => toast.id === id && toast.open)) return
      set(toasts.map((toast) => (toast.id === id ? { ...toast, open: false } : toast)))
    },

    getSnapshot: () => toasts,

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
