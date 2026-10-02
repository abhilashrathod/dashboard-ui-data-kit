import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Bell } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('requires an accessible name at the type level', () => {
    // These lines are checked by `pnpm typecheck`: if the type stops requiring a
    // name, the @ts-expect-error directives themselves become errors.
    const unnamed = (
      // @ts-expect-error aria-label or aria-labelledby is required
      <IconButton>
        <Bell />
      </IconButton>
    )
    const labelled = (
      <IconButton aria-label="Notifications">
        <Bell />
      </IconButton>
    )
    const labelledBy = (
      <IconButton aria-labelledby="heading-id">
        <Bell />
      </IconButton>
    )
    expect([unnamed, labelled, labelledBy]).toHaveLength(3)
  })

  it('takes its name from aria-label and hides the icon', () => {
    render(
      <IconButton aria-label="Notifications">
        <Bell data-testid="icon" />
      </IconButton>,
    )
    const button = screen.getByRole('button', { name: 'Notifications' })
    expect(button).toHaveClass('rounded-pill', 'size-control-md')
    expect(screen.getByTestId('icon').closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('shows a spinner and swallows clicks while loading', async () => {
    const onClick = vi.fn()
    render(
      <IconButton aria-label="Refresh" loading onClick={onClick}>
        <Bell data-testid="icon" />
      </IconButton>,
    )
    const button = screen.getByRole('button', { name: 'Refresh' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByTestId('icon')).toBeNull()
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
