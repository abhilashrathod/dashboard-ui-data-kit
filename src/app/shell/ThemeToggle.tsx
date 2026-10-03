import { Moon, Sun } from 'lucide-react'
import { IconButton, Tooltip } from '@/components'
import { useTheme } from '@/tokens/theme'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const next = resolvedTheme === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${next} theme`

  return (
    <Tooltip content={label} side="bottom">
      <IconButton variant="ghost" aria-label={label} onClick={() => setTheme(next)}>
        {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
      </IconButton>
    </Tooltip>
  )
}
