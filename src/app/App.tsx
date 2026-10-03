import { VIEW_TITLE, useView } from './navigation'
import { AppShell } from './shell/AppShell'
import { OrdersView } from './views/Orders'
import { OverviewView } from './views/Overview'

export function App() {
  const [view] = useView()
  return (
    <AppShell title={VIEW_TITLE[view]}>
      {view === 'orders' ? <OrdersView /> : <OverviewView />}
    </AppShell>
  )
}
