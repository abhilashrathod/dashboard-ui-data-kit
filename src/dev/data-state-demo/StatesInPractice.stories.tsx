import { expect, waitFor, within } from 'storybook/test'
import preview, { type NetworkParameter } from '../../../.storybook/preview'
import { setNetworkConfig } from '@/mocks/network'
import { FilteredOrdersWidget } from './FilteredOrdersWidget'
import { KpiListWidget } from './KpiListWidget'
import { OrdersCountWidget } from './OrdersCountWidget'
import { RevenueTotalWidget } from './RevenueTotalWidget'

/*
 * Data/States in practice: the dev widgets with REAL queries against the MSW
 * API, so the Network toolbar (normal, slow, error, flaky, empty) drives them.
 * Not kit code: these are the usage examples docs/data-states.md links to.
 */

function Dashboard() {
  return (
    <div className="grid max-w-6xl gap-grid lg:grid-cols-3">
      <OrdersCountWidget />
      <RevenueTotalWidget />
      <KpiListWidget />
      <div className="lg:col-span-3">
        <FilteredOrdersWidget />
      </div>
    </div>
  )
}

function ThreeWidgets() {
  return (
    <div className="grid max-w-6xl gap-grid lg:grid-cols-3">
      <OrdersCountWidget />
      <RevenueTotalWidget />
      <KpiListWidget />
    </div>
  )
}

const meta = preview.meta({
  title: 'Data/States in practice',
  component: Dashboard,
  parameters: {
    docs: {
      description: {
        component:
          'Live widgets built on toDataState + DataBoundary. Flip the Network toolbar to see each state; the per-story `network` parameter wins over the toolbar.',
      },
    },
  },
})

const TIMEOUT = { timeout: 4000 }
const region = (name: string) => within(document.body).getByRole('region', { name })

export const Default = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('10,000', {}, TIMEOUT)).toBeVisible()
  },
})

/** Only the KPI endpoint fails; the other widgets are unaffected. */
export const PartialFailure = meta.story({
  parameters: { network: { failEndpoints: ['metrics.kpis'] } satisfies NetworkParameter },
  render: () => <ThreeWidgets />,
  play: async ({ canvas }) => {
    await canvas.findByText('Something went wrong on our side', {}, TIMEOUT)
    await expect(within(region('KPIs')).getByText('Something went wrong on our side')).toBeVisible()
    await waitFor(() => expect(region('Orders')).toHaveTextContent('10,000'), TIMEOUT)
    await waitFor(() => expect(region('Revenue')).toHaveTextContent(/\$[\d,]+\.\d\d/), TIMEOUT)
    await expect(within(region('Orders')).queryByText(/went wrong/)).toBeNull()
  },
})

export const PartialFailureDarkCompact = meta.story({
  tags: ['!autodocs'],
  globals: { theme: 'dark', density: 'compact' },
  parameters: { network: { failEndpoints: ['metrics.kpis'] } satisfies NetworkParameter },
  render: () => <ThreeWidgets />,
  play: async ({ canvas }) => {
    await canvas.findByText('Something went wrong on our side', {}, TIMEOUT)
    await canvas.findByText('10,000', {}, TIMEOUT)
  },
})

export const Empty = meta.story({
  parameters: { network: { mode: 'empty' } satisfies NetworkParameter },
  play: async ({ canvas }) => {
    await canvas.findByText('No revenue yet', {}, TIMEOUT)
    await canvas.findByText('No KPI data yet', {}, TIMEOUT)
    await waitFor(() => expect(canvas.getAllByText('No orders yet')).toHaveLength(2), TIMEOUT)
  },
})

/** The filter matches nothing; Clear filters brings the data back. */
export const NoResults = meta.story({
  render: () => <FilteredOrdersWidget defaultFiltered />,
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText('No orders match these filters', {}, TIMEOUT)
    await userEvent.click(canvas.getByRole('button', { name: 'Clear filters' }))
    await expect(await canvas.findByText('10,000 orders', {}, TIMEOUT)).toBeVisible()
    await expect(
      canvas.getByRole('checkbox', { name: 'Filter: status = failed and amount > 4900' }),
    ).not.toBeChecked()
  },
})

/** 30% of requests fail with 503: use Retry (or the refresh buttons) to see recovery. */
export const Flaky = meta.story({
  parameters: { network: { mode: 'flaky' } satisfies NetworkParameter },
})

/**
 * Keyboard: Tab to Retry, press Enter. The network recovers, the data appears,
 * and focus lands on the region instead of falling to <body>.
 */
export const RetryFocus = meta.story({
  parameters: { network: { mode: 'error' } satisfies NetworkParameter },
  render: () => (
    <div className="max-w-md">
      <OrdersCountWidget />
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText('Something went wrong on our side', {}, TIMEOUT)
    setNetworkConfig({ mode: 'normal' })

    await userEvent.tab() // the card's Refresh button
    await userEvent.tab()
    const retry = canvas.getByRole('button', { name: 'Retry' })
    await expect(retry).toHaveFocus()
    await userEvent.keyboard('{Enter}')

    await expect(await canvas.findByText('10,000', {}, TIMEOUT)).toBeVisible()
    await waitFor(() => expect(region('Orders')).toHaveFocus())
  },
})

/** Loads, then a refresh fails: the banner appears and the old value stays. */
export const StaleAfterFailure = meta.story({
  render: () => (
    <div className="max-w-md">
      <OrdersCountWidget />
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText('10,000', {}, TIMEOUT)
    setNetworkConfig({ mode: 'error' })
    await userEvent.click(canvas.getByRole('button', { name: 'Refresh orders' }))

    await expect(
      await canvas.findByText(/Couldn't refresh · showing data from/, {}, TIMEOUT),
    ).toBeVisible()
    await expect(canvas.getByText('10,000')).toBeVisible()
  },
})
