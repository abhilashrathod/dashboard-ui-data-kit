import { Bell, Download } from 'lucide-react'
import { expect, waitFor, within } from 'storybook/test'
import preview from '../../../.storybook/preview'
import { IconButton } from '../icon-button'
import { Tooltip, TruncatedText } from './Tooltip'

const meta = preview.meta({
  title: 'Overlays/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A short visual label on hover and keyboard focus: \`<Tooltip content="Export" side="top">{trigger}</Tooltip>\`. KitProvider supplies the TooltipProvider (300ms delay).

**A tooltip is never the only accessible name.** An IconButton keeps its \`aria-label\`; the tooltip just shows that label to sighted users.

**TruncatedText** truncates with an ellipsis and shows the full text in a tooltip **only when it actually overflows** (measured on hover/focus). Screen readers always get the full text.

**Do**
- Keep tooltips to a few words, matching the control's accessible name.

**Don't**
- Don't put interactive content or essential instructions in a tooltip; touch users can't hover.
- Don't add a tooltip to an element that already shows the same text.`,
      },
    },
  },
})

/** Keyboard focus shows the tooltip; the button's name stays its aria-label. */
export const OnIconButton = meta.story({
  render: () => (
    <div className="flex gap-2 pt-10">
      <Tooltip content="Notifications">
        <IconButton aria-label="Notifications">
          <Bell />
        </IconButton>
      </Tooltip>
      <Tooltip content="Export CSV" side="bottom">
        <IconButton aria-label="Export CSV">
          <Download />
        </IconButton>
      </Tooltip>
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Notifications' })).toHaveFocus()
    const tooltip = await within(document.body).findByRole('tooltip')
    await expect(tooltip).toHaveTextContent('Notifications')
  },
})

const LONG = 'Augusta Ada King, Countess of Lovelace <ada.lovelace@analytical-engine.example>'

/** Short text: no tooltip. Long text: tooltip with the full text, on hover. */
export const Truncated = meta.story({
  name: 'TruncatedText',
  render: () => (
    <div className="flex w-56 flex-col gap-2 pt-10">
      <TruncatedText data-testid="short">Ada Lovelace</TruncatedText>
      <TruncatedText data-testid="long">{LONG}</TruncatedText>
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const body = within(document.body)
    await userEvent.hover(canvas.getByTestId('short'))
    await new Promise((resolve) => setTimeout(resolve, 500))
    await expect(body.queryByRole('tooltip')).toBeNull()
    await userEvent.unhover(canvas.getByTestId('short'))

    await userEvent.hover(canvas.getByTestId('long'))
    await waitFor(() => expect(body.getByRole('tooltip')).toHaveTextContent(LONG))
  },
})

export const Open = meta.story({
  tags: ['!autodocs'],
  render: () => (
    <div className="pt-10">
      <Tooltip content="Notifications" defaultOpen>
        <IconButton aria-label="Notifications">
          <Bell />
        </IconButton>
      </Tooltip>
    </div>
  ),
})

export const OpenDarkCompact = meta.story({
  tags: ['!autodocs'],
  globals: { theme: 'dark', density: 'compact' },
  render: () => (
    <div className="pt-10">
      <Tooltip content="Notifications" defaultOpen>
        <IconButton aria-label="Notifications">
          <Bell />
        </IconButton>
      </Tooltip>
    </div>
  ),
})
