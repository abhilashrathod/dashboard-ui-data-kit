import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Input } from './Input'
import { SearchInput } from './SearchInput'

describe('Input', () => {
  it('sends native props and ref to the <input>, className to the pill', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input ref={ref} aria-label="Email" placeholder="you@example.com" className="w-64" />)
    const input = screen.getByRole('textbox', { name: 'Email' })
    expect(ref.current).toBe(input)
    expect(input).toHaveAttribute('placeholder', 'you@example.com')
    expect(input.parentElement).toHaveClass('rounded-pill', 'w-64')
  })

  it('marks invalid with aria-invalid and data-invalid', () => {
    render(<Input aria-label="Email" invalid />)
    const input = screen.getByRole('textbox', { name: 'Email' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.parentElement).toHaveAttribute('data-invalid')
  })

  it('focuses the field when the pill padding is clicked', async () => {
    render(<Input aria-label="Email" />)
    const input = screen.getByRole('textbox', { name: 'Email' })
    await userEvent.click(input.parentElement!)
    expect(input).toHaveFocus()
  })
})

describe('SearchInput', () => {
  it('clears an uncontrolled value, fires onChange with "", and refocuses', async () => {
    const onChange = vi.fn()
    render(<SearchInput aria-label="Search" defaultValue="ada" onChange={onChange} />)
    const input = screen.getByRole('searchbox', { name: 'Search' })

    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(input).toHaveValue('')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ target: input }))
    expect(input).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull()
  })

  it('shows the clear button only when there is a value', async () => {
    render(<SearchInput aria-label="Search" />)
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull()
    await userEvent.type(screen.getByRole('searchbox'), 'x')
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument()
  })
})
