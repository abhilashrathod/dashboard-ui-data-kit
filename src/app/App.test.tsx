import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { renderWithProviders } from '@/test/render'
import { App } from './App'

describe('App', () => {
  it('shows the /api/health result served by MSW', async () => {
    renderWithProviders(<App />)

    expect(screen.getByRole('heading', { name: 'Dashboard UI Kit' })).toBeInTheDocument()
    expect(await screen.findByText('ok')).toBeInTheDocument()
  })

  it('shows an error state when the health check fails', async () => {
    server.use(http.get('/api/health', () => new HttpResponse(null, { status: 500 })))

    renderWithProviders(<App />)

    expect(await screen.findByText('unavailable')).toBeInTheDocument()
  })

  it('toggles the theme', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />)

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
  })
})
