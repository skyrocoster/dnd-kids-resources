import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Player } from '../../api/types'
import { Card } from '../../components/Card'
import { BrowserLayout } from '../../components/BrowserLayout'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SearchList } from '../../components/SearchList'
import { StatePanel } from '../../components/StatePanel'
import { initialRemoteState, remoteError, remoteLoading, remoteSuccess } from '../../components/remoteState'
import type { RemoteState } from '../../components/remoteState'
import { UsersIcon } from '../../components/icons'
import { PlayerEditor } from './PlayerEditor'
import { SpellAssignment, WeaponAssignment } from './PlayerAssignments'
import './PlayerBrowserPage.css'

export function PlayerBrowserPage() {
  const [playersRemote, setPlayersRemote] = useState<RemoteState<Player[]>>(initialRemoteState)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Player | null>(null)

  const load = () => {
    setPlayersRemote(remoteLoading())
    api
      .listPlayers()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name))
        setPlayersRemote(remoteSuccess(sorted))
        if (sorted.length > 0 && selectedId == null) setSelectedId(sorted[0].id)
      })
      .catch((error) => setPlayersRemote(remoteError(error instanceof Error ? error.message : 'Failed to load players.')))
  }

  useEffect(load, [])

  const players = playersRemote.status === 'success' ? playersRemote.data : []
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
      <BrowserLayout
        title="Players"
        chapterIcon={<UsersIcon size={18} aria-hidden="true" />}
        detailOpen={selected !== null}
        actions={<Button type="button" onClick={openCreate}>New Player</Button>}
        error={playersRemote.status === 'error' ? playersRemote.error : null}
        listLabel="player list"
        list={
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
              status={playersRemote.status === 'loading' || playersRemote.status === 'idle' ? 'loading' : playersRemote.status === 'error' ? 'error' : 'ready'}
            />
        }
        detail={
            selected ? (
              <div className="player-browser-detail">
                <Button className="browser-layout-back" variant="ghost" onClick={() => setSelectedId(null)}>Back to players</Button>
                <Card
                  title={selected.name}
                  subtitle={selected.class_ || undefined}
                  tag={selected.level != null ? `Level ${selected.level}` : undefined}
                    variant="neutral"
                    footer={
                      <div className="player-browser-actions">
                        <Button variant="secondary" onClick={() => openEdit(selected)}>Edit</Button>
                        <Button variant="danger" onClick={() => setPendingDelete(selected)}>Delete</Button>
                      </div>
                    }
                >
                  <SpellAssignment playerId={selected.id} />
                  <WeaponAssignment playerId={selected.id} />
                </Card>
              </div>
            ) : (
              <StatePanel status="noSelection" message="Choose a player from the list to view their details." />
            )
        }
        editor={editorOpen && (
        <PlayerEditor player={editingPlayer} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />
      )}

        dialog={pendingDelete && (
        <ConfirmDialog
          message={`Delete ${pendingDelete.name}?`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      />
    </div>
  )
}
