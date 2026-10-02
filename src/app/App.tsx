import { Button } from '@/components'
import { useTheme } from '@/tokens/theme'
import { OrdersCard } from './OrdersCard'

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const next = resolvedTheme === 'dark' ? 'light' : 'dark'

  return (
    <Button variant="secondary" onClick={() => setTheme(next)}>
      Switch to {next} theme
    </Button>
  )
}

export function App() {
  return (
    <div className="min-h-screen bg-canvas text-fg">
      <header className="mx-auto max-w-6xl px-6 pt-6">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-surface px-card py-4">
          <h1 className="text-lg font-semibold">Dashboard UI Kit</h1>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid gap-grid sm:grid-cols-2 lg:grid-cols-3">
          <OrdersCard />
        </div>
      </main>
    </div>
  )
}
