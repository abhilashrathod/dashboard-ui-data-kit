import { createContext, use, useEffect, useState, type ReactNode } from 'react'
import { VisuallyHidden } from '../visually-hidden'
import { createAnnouncer, type Announcer, type Politeness } from './scheduler'

const AnnouncerContext = createContext<Announcer['announce'] | null>(null)

/**
 * Two visually hidden live regions (polite and assertive), mounted once so they
 * exist before anything is announced (screen readers ignore regions that
 * appear together with their first message).
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Record<Politeness, string>>({
    polite: '',
    assertive: '',
  })
  const [announcer] = useState(() =>
    createAnnouncer({
      write: (politeness, text) => setMessages((current) => ({ ...current, [politeness]: text })),
    }),
  )

  useEffect(() => () => announcer.cancel(), [announcer])

  return (
    <AnnouncerContext value={announcer.announce}>
      {children}
      <VisuallyHidden aria-live="polite" aria-atomic="true" data-testid="announcer-polite">
        {messages.polite}
      </VisuallyHidden>
      <VisuallyHidden aria-live="assertive" aria-atomic="true" data-testid="announcer-assertive">
        {messages.assertive}
      </VisuallyHidden>
    </AnnouncerContext>
  )
}

/**
 * `announce(message, { politeness })` speaks a message to screen readers only.
 *
 * Use it for state changes the user caused that have no visible message:
 * "Sorted by amount, descending", "42 results", "3 orders marked shipped".
 * Use a toast instead when sighted users need the feedback too.
 * Reserve 'assertive' for errors that block what the user is doing.
 */
export function useAnnounce(): Announcer['announce'] {
  const announce = use(AnnouncerContext)
  if (!announce)
    throw new Error('useAnnounce must be used inside <KitProvider> (or <AnnouncerProvider>).')
  return announce
}
