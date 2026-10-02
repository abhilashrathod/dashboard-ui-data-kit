import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'
import { AVATAR_TONES, avatarToneIndex, initialsOf } from './initials'

describe('initialsOf', () => {
  it.each([
    ['Ada', 'A'],
    ['Ada Lovelace', 'AL'],
    ['Mary Ann Smith', 'MS'],
    ['  grace   hopper ', 'GH'],
    ['Élodie Durand', 'ÉD'],
    ['', ''],
  ])('%j → %j', (name, expected) => {
    expect(initialsOf(name)).toBe(expected)
  })
})

describe('avatarToneIndex', () => {
  it('gives the same name the same palette entry', () => {
    expect(avatarToneIndex('Ada Lovelace')).toBe(avatarToneIndex('Ada Lovelace'))
    expect(avatarToneIndex('Ada Lovelace')).toBe(avatarToneIndex(' ada lovelace '))
  })

  it('stays inside the palette and uses more than one entry', () => {
    const names = ['Ada', 'Grace', 'Linus', 'Margaret', 'Alan', 'Barbara', 'Ken', 'Frances']
    const tones = new Set(names.map(avatarToneIndex))
    for (const tone of tones) expect(tone).toBeLessThan(AVATAR_TONES.length)
    expect(tones.size).toBeGreaterThan(1)
  })
})

describe('Avatar', () => {
  it('is hidden from screen readers when decorative', () => {
    const { container } = render(<Avatar name="Ada Lovelace" decorative />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.firstChild).toHaveTextContent('AL')
  })

  it('names itself otherwise', () => {
    render(<Avatar name="Ada Lovelace" />)
    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveTextContent('AL')
  })
})
