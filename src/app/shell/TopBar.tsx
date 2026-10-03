import { Menu } from 'lucide-react'
import { Avatar, IconButton } from '@/components'
import { DemoControls } from './DemoControls'
import { ThemeToggle } from './ThemeToggle'

export function TopBar({ title, onOpenMenu }: { title: string; onOpenMenu: () => void }) {
  return (
    <header className="flex items-center gap-3 px-4 pt-4 md:px-6 md:pt-6">
      <IconButton
        variant="ghost"
        aria-label="Open navigation"
        onClick={onOpenMenu}
        className="md:hidden"
      >
        <Menu />
      </IconButton>
      <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">{title}</h1>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <DemoControls />
        <ThemeToggle />
        <Avatar name="Alex Rivera" className="ml-1" />
      </div>
    </header>
  )
}
