import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Dungeon, NPC, Quest } from '../../api/types'
import { Card } from '../../components/Card'
import { BrowserLayout } from '../../components/BrowserLayout'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SearchList } from '../../components/SearchList'
import { StatePanel } from '../../components/StatePanel'
import { initialRemoteState, remoteError, remoteLoading, remoteSuccess } from '../../components/remoteState'
import type { RemoteState } from '../../components/remoteState'
import { ScrollIcon } from '../../components/icons'
import { QuestEditor } from './QuestEditor'
import './QuestBrowserPage.css'

export function QuestBrowserPage() {
  const [questsRemote, setQuestsRemote] = useState<RemoteState<Quest[]>>(initialRemoteState)
  const [npcs, setNPCs] = useState<NPC[]>([])
  const [dungeons, setDungeons] = useState<Dungeon[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingQuest, setEditingQuest] = useState<Quest | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Quest | null>(null)

  const load = () => {
    setQuestsRemote(remoteLoading())
    api
      .listQuests()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.title.localeCompare(b.title))
        setQuestsRemote(remoteSuccess(sorted))
        if (sorted.length > 0 && selectedId == null) setSelectedId(sorted[0].id)
      })
      .catch((error) => setQuestsRemote(remoteError(error instanceof Error ? error.message : 'Failed to load quests.')))
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

  const quests = questsRemote.status === 'success' ? questsRemote.data : []
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
      <BrowserLayout
        title="Quests"
        chapterIcon={<ScrollIcon size={18} aria-hidden="true" />}
        detailOpen={selected !== null}
        actions={<Button type="button" onClick={openCreate}>New Quest</Button>}
        error={questsRemote.status === 'error' ? questsRemote.error : null}
        listLabel="quest list"
        list={
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
              status={questsRemote.status === 'loading' || questsRemote.status === 'idle' ? 'loading' : questsRemote.status === 'error' ? 'error' : 'ready'}
            />
        }
        detail={
            selected ? (
              <div className="quest-browser-detail">
                <Button className="browser-layout-back" variant="ghost" onClick={() => setSelectedId(null)}>Back to quests</Button>
                <Card
                  title={selected.title}
                  subtitle={selected.location || undefined}
                    variant="neutral"
                    footer={
                      <div className="quest-browser-actions">
                        <Button variant="secondary" onClick={() => openEdit(selected)}>Edit</Button>
                        <Button variant="danger" onClick={() => setPendingDelete(selected)}>Delete</Button>
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
              <StatePanel status="noSelection" message="Choose a quest from the list to view its details." />
            )
        }
        editor={editorOpen && <QuestEditor quest={editingQuest} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />}
        dialog={pendingDelete && (
        <ConfirmDialog
          message={`Delete ${pendingDelete.title}?`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      />
    </div>
  )
}
