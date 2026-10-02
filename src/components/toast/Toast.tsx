import { X } from 'lucide-react'
import { Toast as ToastPrimitive } from 'radix-ui'
import { createContext, use, useState, useSyncExternalStore, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '../button'
import { IconButton } from '../icon-button'
import { createToastStore, type ToastRecord, type ToastStore, type ToastTone } from './store'

const ToastContext = createContext<ToastStore | null>(null)

/**
 * `toast({ title, description?, tone?, action?, duration? })` returns an id;
 * `dismiss(id)` closes it. Needs KitProvider (or ToastProvider) above.
 */
export function useToast(): Pick<ToastStore, 'dismiss'> & { toast: ToastStore['add'] } {
  const store = use(ToastContext)
  if (!store) throw new Error('useToast must be used inside <KitProvider> (or <ToastProvider>).')
  return { toast: store.add, dismiss: store.dismiss }
}

const TONE_BAR: Record<ToastTone, string> = {
  default: 'before:bg-status-neutral',
  success: 'before:bg-status-success',
  danger: 'before:bg-status-danger',
}

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: string) => void }) {
  return (
    <ToastPrimitive.Root
      open={toast.open}
      onOpenChange={(open) => {
        if (!open) onDismiss(toast.id)
      }}
      duration={toast.duration}
      // Background = polite announcement. Toasts confirm; they don't interrupt.
      type="background"
      data-tone={toast.tone}
      className={cn(
        'relative flex items-start gap-3 rounded-md bg-surface py-3 pr-3 pl-5 text-fg shadow-overlay dark:border dark:border-border',
        // The tone accent: a bar on the left. The title still carries the meaning.
        'before:absolute before:inset-y-3 before:left-2 before:w-1 before:rounded-pill',
        TONE_BAR[toast.tone],
        'data-[state=closed]:animate-fade-out data-[state=open]:animate-toast-in',
        'motion-reduce:data-[state=open]:animate-fade-in',
        // Swipe right to dismiss.
        'data-[swipe=cancel]:translate-x-0 data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x)',
        'data-[swipe=cancel]:transition-[translate] data-[swipe=end]:animate-fade-out',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <ToastPrimitive.Title className="font-medium">{toast.title}</ToastPrimitive.Title>
        {toast.description ? (
          <ToastPrimitive.Description className="text-sm text-fg-muted">
            {toast.description}
          </ToastPrimitive.Description>
        ) : null}
      </div>
      {toast.action ? (
        <ToastPrimitive.Action altText={toast.action.label} asChild>
          <Button variant="secondary" size="sm" onClick={toast.action.onClick}>
            {toast.action.label}
          </Button>
        </ToastPrimitive.Action>
      ) : null}
      <ToastPrimitive.Close asChild>
        <IconButton variant="ghost" size="sm" aria-label="Dismiss" className="size-7">
          <X />
        </IconButton>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  )
}

/**
 * Holds the toast store and renders the viewport (bottom-right, newest at the
 * bottom, max 3). Radix pauses timers on hover/focus, and F8 jumps to the viewport.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createToastStore)
  const toasts = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  return (
    <ToastContext value={store}>
      <ToastPrimitive.Provider swipeDirection="right" label="Notifications">
        {children}
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={store.dismiss} />
        ))}
        <ToastPrimitive.Viewport className="fixed right-0 bottom-0 z-(--z-toast) flex w-96 max-w-full flex-col gap-2 p-4 outline-hidden focus-ring" />
      </ToastPrimitive.Provider>
    </ToastContext>
  )
}
