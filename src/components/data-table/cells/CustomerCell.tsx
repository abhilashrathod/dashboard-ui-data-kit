import { Avatar } from '../../avatar'
import { TruncatedText } from '../../tooltip'

/** Avatar + name + email. The avatar is decorative: the name is right next to it. */
export function CustomerCell({ name, email }: { name: string; email: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar name={name} size="sm" decorative />
      <span className="flex min-w-0 flex-col">
        <TruncatedText className="text-fg">{name}</TruncatedText>
        <TruncatedText className="text-xs text-fg-muted">{email}</TruncatedText>
      </span>
    </span>
  )
}
