import { Button } from '@/components'
import { OrdersTable } from '@/features/orders/OrdersTable'
import { useTheme } from '@/tokens/theme'

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
          <p className="text-lg font-semibold">Dashboard UI Kit</p>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Orders</h1>
          <p className="text-fg-muted">
            Every order across channels. Sort, page and search live in the URL, so any view can be
            shared or bookmarked.
          </p>
        </div>
        {/* The full dashboard shell (navigation, KPIs, charts) is Stage 8. */}
        {/*
          A bounded scroll container, so large pages (500 rows) virtualize:
          the viewport minus the app header, title, toolbar and pagination,
          never under 400px.
        */}
        <OrdersTable gridClassName="max-h-[max(400px,calc(100dvh-22rem))]" />
      </main>
    </div>
  )
}
