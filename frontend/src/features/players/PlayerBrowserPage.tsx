import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Player } from '../../api/types'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SearchList } from '../../components/SearchList'
import { SplitPane } from '../../components/SplitPane'
import { PlayerEditor } from './PlayerEditor'
import { SpellAssignment, WeaponAssignment } from './PlayerAssignments'
import './PlayerBrowserPage.css'

export function PlayerBrowserPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Player | null>(null)

  const load = () => {
    api
      .listPlayers()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name))
        setPlayers(sorted)
        setLoadError(null)
        if (sorted.length > 0 && selectedId == null) setSelectedId(sorted[0].id)
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Failed to load players.'))
  }

  useEffect(load, [])

  const selected = players.find((p) => p.id === selectedId) || null

  const openCreate = () => {
    setEditingPlayer(undefined)
    setEditorOpen(true)
  }
  const openEdit = (player: Player) => {
    setEditingPlayer(player)
    setEditorOpen(true)
  }
  const handleSaved = (player: Player) => {
    setEditorOpen(false)
    setSelectedId(player.id)
    load()
  }
  const confirmDelete = async () => {
    if (!pendingDelete) return
    await api.deletePlayer(pendingDelete.id)
    setPendingDelete(null)
    setSelectedId(null)
    load()
  }

  return (
    <div className="player-browser-page">
      <div className="player-browser-toolbar">
        <h2>Players</h2>
        <button type="button" className="player-browser-new" onClick={openCreate}>
          New Player
        </button>
      </div>

      {loadError && <p className="player-browser-error">{loadError}</p>}

      <div className="player-browser-split">
        <SplitPane
          leftLabel="player list"
          left={
            <SearchList
              items={players}
              getId={(p) => p.id}
              getLabel={(p) => p.name}
              getMeta={(p) => p.class_ || undefined}
              selectedId={selectedId}
              onSelect={(p) => setSelectedId(p.id)}
              variant="neutral"
              searchPlaceholder="Search players…"
              emptyMessage="No players found."
            />
          }
          right={
            selected ? (
              <div className="player-browser-detail">
                <Card
                  title={selected.name}
                  subtitle={selected.class_ || undefined}
                  tag={selected.level != null ? `Level ${selected.level}` : undefined}
                  variant="neutral"
                  footer={
                    <div className="player-browser-actions">
                      <button type="button" onClick={() => openEdit(selected)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="player-browser-delete"
                        onClick={() => setPendingDelete(selected)}
                      >
                        Delete
                      </button>
                    </div>
                  }
                >
                  <SpellAssignment playerId={selected.id} />
                  <WeaponAssignment playerId={selected.id} />
                </Card>
              </div>
            ) : (
              <p className="player-browser-empty">Select a player to see their details.</p>
            )
          }
        />
      </div>

      {editorOpen && (
        <PlayerEditor player={editingPlayer} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />
      )}

      {pendingDelete && (
        <ConfirmDialog
          message={`Delete ${pendingDelete.name}?`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
