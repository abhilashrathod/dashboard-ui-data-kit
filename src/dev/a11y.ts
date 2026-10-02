/*
 * Story parameters for overlays rendered OPEN.
 *
 * A modal overlay (menu, select, dialog, drawer) hides the rest of the page
 * from assistive tech with aria-hidden while trapping focus inside itself. axe
 * doesn't model the focus trap, so it reports the hidden trigger as
 * "aria-hidden element contains focusable elements". These stories exclude
 * exactly what Radix hid (it marks those elements data-aria-hidden="true"), so
 * axe still scans the overlay and everything else. The hidden page itself is
 * scanned by the closed-state stories.
 */
export const openOverlayA11y = {
  a11y: { context: { exclude: ['[data-aria-hidden="true"]'] } },
}
