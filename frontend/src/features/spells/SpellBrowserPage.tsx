import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Spell } from '../../api/types'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DiceText } from '../../components/DiceText'
import { SearchList } from '../../components/SearchList'
import { SplitPane } from '../../components/SplitPane'
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

export function SpellBrowserPage() {
  const [spells, setSpells] = useState<Spell[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSpell, setEditingSpell] = useState<Spell | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Spell | null>(null)

  const load = () => {
    api
      .listSpells()
      .then((data) => {
        const sorted = sortSpells(data)
        setSpells(sorted)
        setLoadError(null)
        if (sorted.length > 0 && selectedId == null) {
          setSelectedId(sorted[0].id)
        }
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Failed to load spells.'))
  }

  useEffect(load, [])

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
      <div className="spell-browser-toolbar">
        <h2>Spells</h2>
        <button type="button" className="spell-browser-new" onClick={openCreate}>
          New Spell
        </button>
      </div>

      {loadError && <p className="spell-browser-error">{loadError}</p>}

      <div className="spell-browser-split">
        <SplitPane
          leftLabel="spell list"
          left={
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
            />
          }
          right={
            selected ? (
              <div className="spell-browser-detail">
                <Card
                  title={selected.name}
                  subtitle={`${levelLabel(selected.level)}${selected.school ? ` · ${selected.school}` : ''}`}
                  tag={selected.concentration ? 'Concentration' : selected.ritual ? 'Ritual' : undefined}
                  variant="spell"
                  footer={
                    <div className="spell-browser-actions">
                      <button type="button" onClick={() => openEdit(selected)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="spell-browser-delete"
                        onClick={() => setPendingDelete(selected)}
                      >
                        Delete
                      </button>
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
              <p className="spell-browser-empty">Select a spell to see its details.</p>
            )
          }
        />
      </div>

      {editorOpen && (
        <SpellEditor spell={editingSpell} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />
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
