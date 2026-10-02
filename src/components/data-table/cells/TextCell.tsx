import { cn } from '@/lib/cn'
import { TruncatedText } from '../../tooltip'

/** One line of text, cut with an ellipsis; the full text shows in a tooltip when cut. */
export function TextCell({ value, muted = false }: { value: string; muted?: boolean }) {
  return <TruncatedText className={cn(muted && 'text-fg-muted')}>{value}</TruncatedText>
}
