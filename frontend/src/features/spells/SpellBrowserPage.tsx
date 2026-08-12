import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Player, Spell } from '../../api/types'
import { Card } from '../../components/Card'
import { BrowserLayout } from '../../components/BrowserLayout'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Dialog } from '../../components/Dialog'
import { DiceText } from '../../components/DiceText'
import { ReferenceText, spellValueReferenceRegistry } from '../../components/referenceText'
import { SearchList } from '../../components/SearchList'
import { StatePanel } from '../../components/StatePanel'
import { initialRemoteState, remoteError, remoteLoading, remoteSuccess } from '../../components/remoteState'
import type { RemoteState } from '../../components/remoteState'
import { WandIcon } from '../../components/icons'
import { levelLabel } from './constants'
import { SpellEditor } from './SpellEditor'
import './SpellBrowserPage.css'

function sortSpells(spells: Spell[]): Spell[] {
  return [...spells].sort((a, b) => {
    const levelA = a.level
    const levelB = b.level
    if (levelA !== levelB) return levelA - levelB
    return a.name.localeCompare(b.name)
  })
}
interface ManageSpellPlayersDialogProps {
  spell: Spell
  onClose: () => void
}

function ManageSpellPlayersDialog({ spell, onClose }: ManageSpellPlayersDialogProps) {
  const [playersRemote, setPlayersRemote] = useState<RemoteState<{ players: Player[]; assignedPlayers: Player[] }>>(initialRemoteState)
  const [draftIds, setDraftIds] = useState<Set<number>>(() => new Set())
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    setPlayersRemote(remoteLoading())
    setActionError(null)
    Promise.all([api.listPlayers(), api.getSpellPlayers(spell.id)])
      .then(([players, assignedPlayers]) => {
        setDraftIds(new Set(assignedPlayers.map((player) => player.id)))
        setPlayersRemote(remoteSuccess({ players, assignedPlayers }))
      })
      .catch((error) => {
        setPlayersRemote(remoteError(error instanceof Error ? error.message : 'Failed to load players.'))
      })
  }, [spell.id])

  const players = playersRemote.status === 'success' ? playersRemote.data.players : []
  const normalizedQuery = query.trim().toLowerCase()
  const filteredPlayers = normalizedQuery
    ? players.filter((player) => player.name.toLowerCase().includes(normalizedQuery))
    : players
  const loadFailed = playersRemote.status === 'error'

  const togglePlayer = (playerId: number) => {
    setDraftIds((current) => {
      const next = new Set(current)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
      }
      return next
    })
  }

  const save = async () => {
    setPending(true)
    setActionError(null)
    try {
      const assignedPlayers = await api.replaceSpellPlayers(spell.id, Array.from(draftIds).sort((a, b) => a - b))
      setDraftIds(new Set(assignedPlayers.map((player) => player.id)))
      onClose()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to save players.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open
      title={`Manage Players for ${spell.name}`}
      onClose={onClose}
      pending={pending}
      className="spell-player-dialog"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={save} loading={pending} disabled={loadFailed}>Save</Button>
        </>
      }
    >
      {playersRemote.status === 'loading' || playersRemote.status === 'idle' ? (
        <StatePanel status="loading" />
      ) : loadFailed ? (
        <StatePanel status="error" message={playersRemote.error} />
      ) : (
        <div className="spell-player-dialog-content">
          <label className="spell-player-search">
            <span>Search players</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search players..."
            />
          </label>
          {actionError && <p className="spell-player-action-error" role="status">{actionError}</p>}
          {players.length === 0 ? (
            <StatePanel status="empty" title="No players available." message="" />
          ) : filteredPlayers.length === 0 ? (
            <StatePanel status="filteredEmpty" title="No matches" />
          ) : (
            <div className="spell-player-checklist">
              {filteredPlayers.map((player) => (
                <label key={player.id} className="spell-player-row">
                  <input
                    type="checkbox"
                    checked={draftIds.has(player.id)}
                    onChange={() => togglePlayer(player.id)}
                  />
                  <span>{player.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </Dialog>
  )
}
export function SpellBrowserPage() {
  const [spellsRemote, setSpellsRemote] = useState<RemoteState<Spell[]>>(initialRemoteState)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSpell, setEditingSpell] = useState<Spell | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Spell | null>(null)
  const [managingPlayersSpell, setManagingPlayersSpell] = useState<Spell | null>(null)

  const load = () => {
    setSpellsRemote(remoteLoading())
    api
      .listSpells()
      .then((data) => {
        const sorted = sortSpells(data)
        setSpellsRemote(remoteSuccess(sorted))
        if (sorted.length > 0 && selectedId == null) {
          setSelectedId(sorted[0].id)
        }
      })
      .catch((error) => setSpellsRemote(remoteError(error instanceof Error ? error.message : 'Failed to load spells.')))
  }

  useEffect(load, [])

  const spells = spellsRemote.status === 'success' ? spellsRemote.data : []
  const selected = spells.find((s) => s.id === selectedId) || null

  const openCreate = () => {
    setEditingSpell(undefined)
    setEditorOpen(true)
  }

  const openEdit = (spell: Spell) => {
    setEditingSpell(spell)
    setEditorOpen(true)
  }

  const handleSaved = (spell: Spell) => {
    setEditorOpen(false)
    setSelectedId(spell.id)
    load()
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await api.deleteSpell(pendingDelete.id)
    setPendingDelete(null)
    setSelectedId(null)
    load()
  }

  return (
    <div className="spell-browser-page">
      <BrowserLayout
        title="Spells"
        chapterIcon={<WandIcon size={18} aria-hidden="true" />}
        detailOpen={selected !== null}
        actions={<Button type="button" onClick={openCreate}>New Spell</Button>}
        error={spellsRemote.status === 'error' ? spellsRemote.error : null}
        listLabel="spell list"
        listCollapsible
        list={
            <SearchList
              items={spells}
              getId={(s) => s.id}
              getLabel={(s) => s.name}
              getMeta={(s) => levelLabel(s.level)}
              selectedId={selectedId}
              onSelect={(s) => setSelectedId(s.id)}
              variant="spell"
              searchPlaceholder="Search spells…"
              emptyMessage="No spells found."
              status={spellsRemote.status === 'loading' || spellsRemote.status === 'idle' ? 'loading' : spellsRemote.status === 'error' ? 'error' : 'ready'}
            />
        }
        detail={
            selected ? (
              <div className="spell-browser-detail">
                 <Button className="browser-layout-back" variant="ghost">Back to spells</Button>
                <Card
                  title={selected.name}
                  subtitle={`${levelLabel(selected.level)}${selected.school ? ` · ${selected.school}` : ''}`}
                  tag={selected.concentration ? 'Concentration' : selected.ritual ? 'Ritual' : undefined}
                    variant="spell"
                    footer={
                      <div className="spell-browser-actions">
                        <Button variant="secondary" onClick={() => setManagingPlayersSpell(selected)}>Manage Players</Button>
                        <Button variant="secondary" onClick={() => openEdit(selected)}>Edit</Button>
                        <Button variant="danger" onClick={() => setPendingDelete(selected)}>Delete</Button>
                      </div>
                    }
                >
                  <dl className="spell-browser-meta">
                    {selected.casting_times.length > 0 && (
                      <>
                        <dt>Casting Time</dt>
                        <dd>{selected.casting_times.join(' or ')}</dd>
                      </>
                    )}
                    {selected.range && (
                      <>
                        <dt>Range</dt>
                        <dd>{selected.range}</dd>
                      </>
                    )}
                    {selected.duration && (
                      <>
                        <dt>Duration</dt>
                        <dd>{selected.duration}</dd>
                      </>
                    )}
                    {selected.components && selected.components.length > 0 && (
                      <>
                        <dt>Components</dt>
                        <dd>{selected.components.join(', ')}</dd>
                      </>
                    )}
                    {selected.materials && (
                      <>
                        <dt>Materials</dt>
                        <dd>{selected.materials}</dd>
                      </>
                    )}
                    {selected.concentration && <><dt>Concentration</dt><dd>Yes</dd></>}
                    {selected.ritual && <><dt>Ritual</dt><dd>Yes</dd></>}
                  </dl>
                  {selected.quick_rules && (
                    <p className="spell-browser-quick-rules">
                      <ReferenceText
                        text={selected.quick_rules}
                        registry={spellValueReferenceRegistry}
                        context={{}}
                      />
                    </p>
                  )}
                  {selected.description && (
                    <p>
                      <DiceText text={selected.description} />
                    </p>
                  )}
                  {selected.alternate_description && <p><DiceText text={selected.alternate_description} /></p>}
                  {selected.higher_levels.text && (
                    <p>
                      <strong>At Higher Levels: </strong>
                      <DiceText text={selected.higher_levels.text} />
                    </p>
                  )}
                </Card>
              </div>
            ) : (
              <StatePanel status="noSelection" message="Choose a spell from the list to view its details." />
            )
        }
        editor={editorOpen && (
        <SpellEditor spell={editingSpell} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />
      )}
        dialog={(
          <>
            {pendingDelete && (
              <ConfirmDialog
                message={`Delete ${pendingDelete.name}?`}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
              />
            )}
            {managingPlayersSpell && (
              <ManageSpellPlayersDialog
                spell={managingPlayersSpell}
                onClose={() => setManagingPlayersSpell(null)}
              />
            )}
          </>
        )}      />
    </div>
  )
}



