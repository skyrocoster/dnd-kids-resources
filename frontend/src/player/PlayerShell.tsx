import { Outlet } from 'react-router-dom'
import './PlayerShell.css'
import { PlayerMapRenderer } from './PlayerMapRenderer'
import { usePlayerMapData } from './usePlayerMapData'

export function PlayerShell() {
  return (
    <div className="player-shell">
      <Outlet />
    </div>
  )
}

export function PlayerHome() {
  return (
    <nav className="player-destinations" aria-label="Player destinations">
      <a className="player-destination" href="/play/map">
        <span className="player-destination-icon" aria-hidden="true">[]</span>
        <span>Map</span>
      </a>
    </nav>
  )
}

export function PlayerMapRoute() {
  const { layout, status, openDoorIds, partyRoomId } = usePlayerMapData()

  return (
    <>
      {status === 'loading' && <p className="player-map-message">Loading map…</p>}
      {status === 'empty' && <p className="player-map-message">No map yet.</p>}
      {status === 'error' && <p className="player-map-message">The map didn't load. Ask your DM.</p>}
      {status === 'ready' && layout && (
        <PlayerMapRenderer layout={layout} openDoorIds={openDoorIds} partyRoomId={partyRoomId} />
      )}
    </>
  )
}
