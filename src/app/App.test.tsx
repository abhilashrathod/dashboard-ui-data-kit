import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { setNetworkConfig } from '@/mocks/network'
import { renderWithProviders } from '@/test/render'
import { App } from './App'

const ordersRegion = () => screen.getByRole('region', { name: 'Orders' })

describe('App', () => {
  it('shows the orders table from the mock API', async () => {
    renderWithProviders(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Orders' })).toBeInTheDocument()
    // Header row + one page of 50. (The skeleton is a table too, so wait for the rows.)
    await waitFor(() =>
      expect(
        within(screen.getByRole('table', { name: 'Orders' })).getAllByRole('row'),
      ).toHaveLength(51),
    )
    expect(screen.getByTestId('data-table-range')).toHaveTextContent('Showing 1–50 of 10,000')
  })

  it('opens a shared view from the URL', async () => {
    renderWithProviders(<App />, { url: '?orders.page=3&orders.sort=-amount' })

    await screen.findByRole('table', { name: 'Orders' })
    expect(screen.getByRole('columnheader', { name: /^Amount/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    expect(await screen.findByText(/^Page/)).toHaveTextContent('Page 3 of 200')
  })

  it('shows the error state, with the request id, when the API fails', async () => {
    setNetworkConfig({ mode: 'error' })

    renderWithProviders(<App />)

    expect(await within(ordersRegion()).findByText(/req_000001/)).toBeInTheDocument()
    // The toolbar stays usable.
    expect(screen.getByRole('searchbox', { name: 'Search orders' })).toBeEnabled()
  })

  it('toggles the theme', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />)

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
  })
})
