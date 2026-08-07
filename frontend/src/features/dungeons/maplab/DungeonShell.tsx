import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAppShellRowSlots } from '../../../layout/AppShell'
import './DungeonShell.css'
import { MapLabRouteState } from './MapLabRouteState'
import {
  DungeonRouteContextProvider,
  DungeonShellStatusSlotProvider,
  useDungeonRouteContext,
} from './dungeonRouteContext'

export function DungeonShell() {
  const { dungeonId: dungeonIdParam } = useParams()
  const location = useLocation()
  const route = useDungeonRouteContext(dungeonIdParam)
  const [statusSlotEl, setStatusSlotEl] = useState<HTMLDivElement | null>(null)
  const { identitySlot } = useAppShellRowSlots()

  // Dungeon routes are app-like, not document-like: the map fills the window and never scrolls the
  // page. Flagged on <body> rather than matched with a `:has()` selector so it also works on the
  // older tablet browsers this gets run on at the table, where `:has()` may not be supported.
  useEffect(() => {
    document.body.dataset.appLayout = 'fill'
    return () => {
      delete document.body.dataset.appLayout
    }
  }, [])

  let routeState: { title: string; message: string; variant: 'error' | 'loading' } | null = null
  if (route.status === 'invalid') {
    routeState = { title: 'Invalid dungeon', message: 'Invalid dungeon URL.', variant: 'error' }
  } else if (route.status === 'missing') {
    routeState = { title: 'Dungeon missing', message: 'This dungeon does not exist.', variant: 'error' }
  } else if (route.status === 'error') {
    routeState = { title: 'Dungeon unavailable', message: route.error?.message ?? 'Failed to load dungeon.', variant: 'error' }
  } else if (route.status === 'loading') {
    routeState = { title: 'Loading dungeon', message: 'Loading dungeon details…', variant: 'loading' }
  }

  const dungeonId = route.dungeonId
  const viewPath = dungeonId === null ? '/dungeons' : `/dungeons/${dungeonId}`
  const editPath = dungeonId === null ? '/dungeons' : `/dungeons/${dungeonId}/edit`
  const isEditMode = dungeonId !== null && location.pathname === editPath
  const rowIdentity = (
    <div className="dungeon-shell-row">
      <div className="dungeon-shell-heading">
        <h1 className="dungeon-shell-title">Map Lab</h1>
        <span className="dungeon-shell-context">{route.dungeon?.title}</span>
      </div>
      <div className="dungeon-shell-row-controls">
        <nav className="dungeon-shell-mode-toggle" aria-label="Dungeon mode">
          <Link to={viewPath} className="dungeon-shell-mode-link" aria-current={isEditMode ? undefined : 'page'} data-active={isEditMode ? undefined : 'true'}>
            View
          </Link>
          <Link to={editPath} className="dungeon-shell-mode-link" aria-current={isEditMode ? 'page' : undefined} data-active={isEditMode ? 'true' : undefined}>
            Edit map
          </Link>
        </nav>
        <div className="dungeon-shell-status-slot" ref={setStatusSlotEl} />
        <Link to="/dungeons" className="dungeon-shell-back-link">
          Back to dungeons
        </Link>
      </div>
    </div>
  )

  return (
    <DungeonRouteContextProvider value={route}>
      <section className="dungeon-shell">
        {routeState ? (
          <>
            <MapLabRouteState className="dungeon-shell-route-state" title={routeState.title} message={routeState.message} variant={routeState.variant} />
            <Link to="/dungeons" className="dungeon-shell-back-link">
              Back to dungeons
            </Link>
          </>
        ) : (
          <>
            {identitySlot ? createPortal(rowIdentity, identitySlot) : rowIdentity}

            <div className="dungeon-shell-body">
              <DungeonShellStatusSlotProvider value={statusSlotEl}>
                <Outlet />
              </DungeonShellStatusSlotProvider>
            </div>
          </>
        )}
      </section>
    </DungeonRouteContextProvider>
  )
}
