import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { AVATAR_TONES, avatarToneIndex, initialsOf } from './initials'

export const avatarVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-pill font-medium select-none',
  {
    variants: {
      size: {
        sm: 'size-7 text-xs',
        md: 'size-9 text-sm',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

export type AvatarProps = Omit<ComponentProps<'span'>, 'children'> &
  VariantProps<typeof avatarVariants> & {
    name: string
    /** The name is shown next to it: hide the avatar from screen readers. */
    decorative?: boolean
  }

/** Initials in a circle, tinted from a hash of the name. */
export function Avatar({ name, size, decorative = false, className, ...props }: AvatarProps) {
  return (
    <span
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name })}
      data-tone={avatarToneIndex(name)}
      className={cn(avatarVariants({ size }), AVATAR_TONES[avatarToneIndex(name)], className)}
      {...props}
    >
      {initialsOf(name)}
    </span>
  )
}
