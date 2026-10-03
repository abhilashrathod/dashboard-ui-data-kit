import { useState, type ReactNode } from 'react'
import { Drawer, DrawerContent, DrawerTitle, VisuallyHidden } from '@/components'
import { SidebarNav, Sidebar, Wordmark } from './Sidebar'
import { TopBar } from './TopBar'

const COLLAPSED_KEY = 'dashboard-ui-kit:sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

function writeCollapsed(collapsed: boolean) {
  try {
    if (collapsed) window.localStorage.setItem(COLLAPSED_KEY, 'true')
    else window.localStorage.removeItem(COLLAPSED_KEY)
  } catch {
    // Storage unavailable: the choice just isn't remembered.
  }
}

/**
 * The frame around every view. On lg+ the app sits in one rounded container
 * on a darker backdrop; below lg it runs edge to edge. Below md the sidebar
 * moves into a left Drawer opened from the top bar.
 */
export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [menuOpen, setMenuOpen] = useState(false)

  const changeCollapsed = (next: boolean) => {
    writeCollapsed(next)
    setCollapsed(next)
  }

  return (
    <div className="min-h-dvh bg-canvas text-fg lg:bg-surface-muted lg:p-4">
      <a
        href="#main"
        className="sr-only rounded-pill bg-ink px-4 py-2 font-medium text-ink-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--z-dropdown) focus-ring"
      >
        Skip to main content
      </a>
      <div className="flex min-h-dvh bg-canvas lg:min-h-[calc(100dvh-2rem)] lg:rounded-xl">
        <Sidebar collapsed={collapsed} onCollapsedChange={changeCollapsed} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar title={title} onOpenMenu={() => setMenuOpen(true)} />
          <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col gap-grid px-4 py-6 outline-none md:px-6">
            {children}
          </main>
        </div>
      </div>

      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent side="left" size="sm" className="w-72 gap-8 bg-canvas px-4 py-6">
          <DrawerTitle asChild>
            <div className="px-2">
              <Wordmark />
              <VisuallyHidden> navigation</VisuallyHidden>
            </div>
          </DrawerTitle>
          <SidebarNav onNavigate={() => setMenuOpen(false)} />
        </DrawerContent>
      </Drawer>
    </div>
  )
}
