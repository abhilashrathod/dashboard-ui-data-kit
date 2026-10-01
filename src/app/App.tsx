import { useTheme } from '@/tokens/theme'
import { OrdersCard } from './OrdersCard'

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const next = resolvedTheme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg-default shadow-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas focus-visible:outline-none"
    >
      Switch to {next} theme
    </button>
  )
}

export function App() {
  return (
    <div className="min-h-screen bg-canvas text-fg-default">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <h1 className="text-lg font-semibold">Dashboard UI Kit</h1>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <OrdersCard />
        </div>
      </main>
    </div>
  )
}
