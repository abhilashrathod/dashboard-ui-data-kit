import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Download } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('is a type="button" by default and fires onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders as a link with asChild, keeping the styles and icons', () => {
    render(
      <Button asChild variant="outline" rightIcon={<Download />} className="custom">
        <a href="/orders">Orders</a>
      </Button>,
    )
    const link = screen.getByRole('link', { name: 'Orders' })
    expect(link).toHaveAttribute('href', '/orders')
    expect(link).toHaveClass('rounded-pill', 'border-border-strong', 'custom')
    expect(link.querySelector('svg')).not.toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('keeps the label node (and so its width and name) while loading', () => {
    const { rerender } = render(<Button>Save changes</Button>)
    const label = screen.getByText('Save changes')

    rerender(<Button loading>Save changes</Button>)
    const button = screen.getByRole('button', { name: 'Save changes' })
    expect(button).toHaveAttribute('data-loading')
    expect(button).toHaveAttribute('aria-busy', 'true')
    // The same DOM node, still rendered: only made transparent.
    expect(screen.getByText('Save changes')).toBe(label)
    expect(label).toHaveClass('opacity-0')
    expect(button.querySelector('[data-slot="spinner"]')).not.toBeNull()
  })

  it('swaps the left icon for the spinner, leaving the label visible', () => {
    render(
      <Button loading leftIcon={<Download data-testid="icon" />}>
        Saving
      </Button>,
    )
    expect(screen.queryByTestId('icon')).toBeNull()
    expect(screen.getByText('Saving')).not.toHaveClass('opacity-0')
  })

  it('swallows clicks and form submission while loading, but stays focusable', async () => {
    const onClick = vi.fn()
    const onSubmit = vi.fn((event: Event) => event.preventDefault())
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <Button type="submit" loading onClick={onClick}>
          Save
        </Button>
      </form>,
    )
    const button = screen.getByRole('button', { name: 'Save' })
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(button).not.toBeDisabled()
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })

  it('blocks clicks when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('data-disabled')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('blocks clicks on a disabled asChild link', async () => {
    const onClick = vi.fn()
    render(
      <Button asChild disabled onClick={onClick}>
        <a href="#x">Go</a>
      </Button>,
    )
    const link = screen.getByRole('link', { name: 'Go' })
    expect(link).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(link)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('merges className last', () => {
    render(<Button className="px-8">Wide</Button>)
    const button = screen.getByRole('button', { name: 'Wide' })
    expect(button).toHaveClass('px-8')
    expect(button).not.toHaveClass('px-4')
  })
})
