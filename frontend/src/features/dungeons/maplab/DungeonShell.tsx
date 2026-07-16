import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import './DungeonShell.css'
import { MapLabRouteState } from './MapLabRouteState'
import {
  DungeonRouteContextProvider,
  useDungeonRouteContext,
} from './dungeonRouteContext'

function shellSubtitle(pathname: string, dungeonId: number | null): string {
  if (dungeonId !== null && pathname.endsWith(`/dungeons/${dungeonId}/edit`)) {
    return 'Create rooms, shape their footprint, and place map fixtures.'
  }
  return 'Run the dungeon from the map with production room context and navigation.'
}

export function DungeonShell() {
  const { dungeonId: dungeonIdParam } = useParams()
  const location = useLocation()
  const route = useDungeonRouteContext(dungeonIdParam)

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
            <header className="dungeon-shell-header">
              <div className="dungeon-shell-heading">
                <Link to="/dungeons" className="dungeon-shell-back-link">
                  Back to dungeons
                </Link>
                <h1 className="dungeon-shell-title">{route.dungeon?.title}</h1>
                <p className="dungeon-shell-subtitle">{shellSubtitle(location.pathname, dungeonId)}</p>
              </div>

              <nav className="dungeon-shell-mode-toggle" aria-label="Dungeon mode">
                <Link
                  to={viewPath}
                  className="dungeon-shell-mode-link"
                  aria-current={isEditMode ? undefined : 'page'}
                  data-active={isEditMode ? undefined : 'true'}
                >
                  View
                </Link>
                <Link
                  to={editPath}
                  className="dungeon-shell-mode-link"
                  aria-current={isEditMode ? 'page' : undefined}
                  data-active={isEditMode ? 'true' : undefined}
                >
                  Edit map
                </Link>
              </nav>
            </header>

            <div className="dungeon-shell-body">
              <Outlet />
            </div>
          </>
        )}
      </section>
    </DungeonRouteContextProvider>
  )
}
