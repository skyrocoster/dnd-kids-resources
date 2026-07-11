import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Dungeon, NPC, Quest } from '../../api/types'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SearchList } from '../../components/SearchList'
import { SplitPane } from '../../components/SplitPane'
import { QuestEditor } from './QuestEditor'
import './QuestBrowserPage.css'

export function QuestBrowserPage() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [npcs, setNPCs] = useState<NPC[]>([])
  const [dungeons, setDungeons] = useState<Dungeon[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingQuest, setEditingQuest] = useState<Quest | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Quest | null>(null)

  const load = () => {
    api
      .listQuests()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.title.localeCompare(b.title))
        setQuests(sorted)
        setLoadError(null)
        if (sorted.length > 0 && selectedId == null) setSelectedId(sorted[0].id)
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Failed to load quests.'))
  }

  useEffect(load, [])
  useEffect(() => {
    api
      .listNPCs()
      .then(setNPCs)
      .catch(() => setNPCs([]))
    api
      .listDungeons()
      .then(setDungeons)
      .catch(() => setDungeons([]))
  }, [])

  const selected = quests.find((q) => q.id === selectedId) || null
  const questGiverName = selected?.quest_giver != null ? npcs.find((n) => n.id === selected.quest_giver)?.name : undefined
  const dungeonTitle = selected?.dungeon_id != null ? dungeons.find((d) => d.id === selected.dungeon_id)?.title : undefined

  const openCreate = () => {
    setEditingQuest(undefined)
    setEditorOpen(true)
  }
  const openEdit = (quest: Quest) => {
    setEditingQuest(quest)
    setEditorOpen(true)
  }
  const handleSaved = (quest: Quest) => {
    setEditorOpen(false)
    setSelectedId(quest.id)
    load()
  }
  const confirmDelete = async () => {
    if (!pendingDelete) return
    await api.deleteQuest(pendingDelete.id)
    setPendingDelete(null)
    setSelectedId(null)
    load()
  }

  return (
    <div className="quest-browser-page">
      <div className="quest-browser-toolbar">
        <h2>Quests</h2>
        <button type="button" className="quest-browser-new" onClick={openCreate}>
          New Quest
        </button>
      </div>

      {loadError && <p className="quest-browser-error">{loadError}</p>}

      <div className="quest-browser-split">
        <SplitPane
          leftLabel="quest list"
          left={
            <SearchList
              items={quests}
              getId={(q) => q.id}
              getLabel={(q) => q.title}
              getMeta={(q) => q.location || undefined}
              selectedId={selectedId}
              onSelect={(q) => setSelectedId(q.id)}
              variant="neutral"
              searchPlaceholder="Search quests…"
              emptyMessage="No quests found."
            />
          }
          right={
            selected ? (
              <div className="quest-browser-detail">
                <Card
                  title={selected.title}
                  subtitle={selected.location || undefined}
                  variant="neutral"
                  footer={
                    <div className="quest-browser-actions">
                      <button type="button" onClick={() => openEdit(selected)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="quest-browser-delete"
                        onClick={() => setPendingDelete(selected)}
                      >
                        Delete
                      </button>
                    </div>
                  }
                >
                  {selected.summary && <p>{selected.summary}</p>}

                  <dl className="quest-browser-meta">
                    {questGiverName && (
                      <>
                        <dt>Quest Giver</dt>
                        <dd>{questGiverName}</dd>
                      </>
                    )}
                    {dungeonTitle && (
                      <>
                        <dt>Dungeon</dt>
                        <dd>{dungeonTitle}</dd>
                      </>
                    )}
                  </dl>

                  {selected.objectives && selected.objectives.length > 0 && (
                    <div className="quest-browser-block">
                      <h4>Objectives</h4>
                      <ul>
                        {selected.objectives.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selected.details && selected.details.length > 0 && (
                    <div className="quest-browser-block">
                      <h4>Details</h4>
                      <ul>
                        {selected.details.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selected.reward && selected.reward.length > 0 && (
                    <div className="quest-browser-block">
                      <h4>Rewards</h4>
                      <ul>
                        {selected.reward.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              </div>
            ) : (
              <p className="quest-browser-empty">Select a quest to see its details.</p>
            )
          }
        />
      </div>

      {editorOpen && <QuestEditor quest={editingQuest} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />}

      {pendingDelete && (
        <ConfirmDialog
          message={`Delete ${pendingDelete.title}?`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
