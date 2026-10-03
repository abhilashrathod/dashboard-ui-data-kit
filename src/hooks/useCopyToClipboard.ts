import { useToast } from '@/components/toast'

/**
 * Copies text and says so in a toast: "Email copied", or, when the Clipboard
 * API is missing or refuses (insecure context, denied permission), a danger
 * toast "Couldn't copy" with the text in its description, so the user can
 * still select it by hand. Resolves to whether the copy worked.
 *
 *   const copy = useCopyToClipboard()
 *   copy(order.customer.email, 'Email copied')
 */
export function useCopyToClipboard() {
  const { toast } = useToast()
  return async (text: string, success: string): Promise<boolean> => {
    try {
      // `navigator.clipboard` is undefined outside secure contexts: that throws too.
      await navigator.clipboard.writeText(text)
      toast({ title: success, tone: 'success' })
      return true
    } catch {
      toast({ title: "Couldn't copy", description: text, tone: 'danger' })
      return false
    }
  }
}
