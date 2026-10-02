import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/*
 * tailwind-merge must know the kit's custom theme keys. Without this, a class
 * like `text-display` is mistaken for a text COLOR, so cn('text-fg',
 * 'text-display') would silently drop `text-fg`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['md', 'display-sm', 'display'],
      spacing: ['card', 'tile', 'grid', 'row', 'control-sm', 'control-md', 'control-lg'],
      radius: ['pill'],
      shadow: ['overlay'],
      ease: ['standard'],
    },
    classGroups: {
      'bg-image': ['bg-gradient-accent'],
    },
  },
})

/** Compose class names; later Tailwind classes win over conflicting earlier ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
