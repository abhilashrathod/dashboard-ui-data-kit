import { expect } from 'storybook/test'
import preview from '../../.storybook/preview'
import { TokensPage } from './TokensPage'

const meta = preview.meta({
  title: 'Foundations/Tokens',
  component: TokensPage,
})

export const Tokens = meta.story({
  // Remount when the toolbar changes, so values are re-read under the new density.
  render: (_args, { globals }) => (
    <TokensPage key={`${String(globals.theme)}:${String(globals.density)}`} />
  ),
  play: async ({ canvas }) => {
    const summary = await canvas.findByTestId('contrast-summary')
    await expect(summary).toHaveTextContent(/Pass/)
    await expect(canvas.queryAllByText('Fail')).toHaveLength(0)
  },
})

/** The page always shows both themes; this variant flips the surrounding chrome. */
export const DarkChrome = meta.story({
  globals: { theme: 'dark', density: 'compact' },
  play: async ({ canvas }) => {
    await canvas.findByTestId('contrast-summary')
    await expect(canvas.queryAllByText('Fail')).toHaveLength(0)
  },
})
