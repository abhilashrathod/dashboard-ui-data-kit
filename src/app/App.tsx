import { VIEW_TITLE, useView } from './navigation'
import { NewOrderProvider } from './newOrder'
import { AppShell } from './shell/AppShell'
import { OrdersView } from './views/Orders'
import { OverviewView } from './views/Overview'

export function App() {
  const [view] = useView()
  return (
    <NewOrderProvider>
      <AppShell title={VIEW_TITLE[view]}>
        {view === 'orders' ? <OrdersView /> : <OverviewView />}
      </AppShell>
    </NewOrderProvider>
  )
}
