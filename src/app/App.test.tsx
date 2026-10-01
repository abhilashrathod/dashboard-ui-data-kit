import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { setNetworkConfig } from '@/mocks/network'
import { renderWithProviders } from '@/test/render'
import { App } from './App'

describe('App', () => {
  it('shows the order count from the mock API', async () => {
    renderWithProviders(<App />)

    expect(screen.getByRole('heading', { name: 'Dashboard UI Kit' })).toBeInTheDocument()
    expect(screen.getByText('Loading orders…')).toBeInTheDocument()
    expect(await screen.findByText('Orders API: 10,000 orders')).toBeInTheDocument()
  })

  it('shows the error code and request id when the API fails', async () => {
    setNetworkConfig({ mode: 'error' })

    renderWithProviders(<App />)

    expect(
      await screen.findByText('Orders API error: SERVER_ERROR · req_000001'),
    ).toBeInTheDocument()
  })

  it('refreshes the query on demand', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />)
    await screen.findByText('Orders API: 10,000 orders')

    setNetworkConfig({ mode: 'empty' })
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(await screen.findByText('Orders API: 0 orders')).toBeInTheDocument()
  })

  it('toggles the theme', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />)

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
  })
})
