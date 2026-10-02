import { useState } from 'react'
import { expect, waitFor, within } from 'storybook/test'
import preview from '../../../.storybook/preview'
import { Button } from '../button'
import { AnnouncerProvider, useAnnounce } from './Announcer'

const meta = preview.meta({
  title: 'Utilities/Announcer',
  component: AnnouncerProvider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Screen-reader announcements through two visually hidden live regions (polite and assertive), rendered by KitProvider.

\`\`\`tsx
const announce = useAnnounce()
announce('Sorted by amount, descending')
announce('Payment failed', { politeness: 'assertive' })
\`\`\`

Repeating the same message is still read (the region is cleared, then set on the next frame). Calls within ~150ms collapse into one, and the last wins.

**Announce or toast?** Announce state changes the **user caused** that have **no visible message**: sort order, result counts after filtering, "3 rows selected". Use a toast when everyone needs to see the feedback.

**Do**
- Keep messages short and complete: "42 results", not "Updated".

**Don't**
- Don't use 'assertive' except for errors that block the user's task; it interrupts.
- Don't announce what already has focus or is announced by its own role (a dialog title, a toast).`,
      },
    },
  },
})

const SORTS = ['amount, descending', 'amount, ascending', 'date, newest first'] as const

function Demo() {
  const announce = useAnnounce()
  const [index, setIndex] = useState(0)
  const [last, setLast] = useState<string | null>(null)
  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        variant="secondary"
        onClick={() => {
          const message = `Sorted by ${SORTS[index]}`
          announce(message)
          setLast(message)
          setIndex((index + 1) % SORTS.length)
        }}
      >
        Change sort
      </Button>
      <p className="text-sm text-fg-muted">
        Announced (mirrored here for the demo; normally only screen readers hear it):{' '}
        <span className="text-fg" data-testid="mirror">
          {last ?? '(nothing yet)'}
        </span>
      </p>
    </div>
  )
}

export const Basic = meta.story({
  render: () => <Demo />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Change sort' }))
    const region = within(document.body).getByTestId('announcer-polite')
    await expect(region).toHaveAttribute('aria-live', 'polite')
    await waitFor(() => expect(region).toHaveTextContent('Sorted by amount, descending'))
  },
})
