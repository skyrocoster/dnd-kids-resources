import { useState } from 'react'
import type { FormEvent } from 'react'
import * as api from '../../api/client'
import type { Dungeon } from '../../api/types'
import { CheckboxField } from '../../components/form/CheckboxField'
import { TextField } from '../../components/form/TextField'
import type { DungeonFormState } from './dungeonForm'
import {
  addDoor,
  addRoom,
  addRoomEntry,
  dungeonToFormState,
  emptyDungeonForm,
  formStateToDungeonInput,
} from './dungeonForm'
import './DungeonEditor.css'

interface DungeonEditorProps {
  dungeon?: Dungeon
  onClose: () => void
  onSaved: (dungeon: Dungeon) => void
}

export function DungeonEditor({ dungeon, onClose, onSaved }: DungeonEditorProps) {
  const [form, setForm] = useState<DungeonFormState>(() =>
    dungeon ? dungeonToFormState(dungeon) : emptyDungeonForm(),
  )
  const [status, setStatus] = useState<{ message: string; kind?: 'error' | 'success' }>({ message: '' })
  const [saving, setSaving] = useState(false)

  const patch = (fields: Partial<DungeonFormState>) => setForm((prev) => ({ ...prev, ...fields }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setStatus({ message: 'Saving dungeon…' })
    const payload = formStateToDungeonInput(form)
    try {
      const saved = dungeon ? await api.updateDungeon(dungeon.id, payload) : await api.createDungeon(payload)
      setStatus({ message: 'Dungeon saved.', kind: 'success' })
      onSaved(saved)
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : 'Failed to save dungeon.', kind: 'error' })
      setSaving(false)
    }
  }

  return (
    <div className="dungeon-editor-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dungeon-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-label={dungeon ? `Edit ${dungeon.title}` : 'Add new dungeon'}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dungeon-editor-header">
          <h2>{dungeon ? `Edit Dungeon: ${dungeon.title}` : 'Add New Dungeon'}</h2>
          <button type="button" className="dungeon-editor-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {status.message && <p className={`dungeon-editor-status ${status.kind || ''}`}>{status.message}</p>}

        <form onSubmit={handleSubmit} className="dungeon-editor-form">
          <TextField label="Title" value={form.title} onChange={(e) => patch({ title: e.target.value })} required />

          <section className="dungeon-editor-section">
            <h3>General Info</h3>
            <div className="dungeon-editor-grid">
              <TextField
                label="Info Title"
                value={form.generalInfoTitle}
                onChange={(e) => patch({ generalInfoTitle: e.target.value })}
              />
              <TextField label="Size" value={form.size} onChange={(e) => patch({ size: e.target.value })} />
              <TextField
                label="Illumination"
                value={form.illumination}
                onChange={(e) => patch({ illumination: e.target.value })}
              />
              <TextField
                label="Temperature"
                value={form.temperature}
                onChange={(e) => patch({ temperature: e.target.value })}
              />
              <TextField label="Walls" value={form.walls} onChange={(e) => patch({ walls: e.target.value })} />
              <TextField label="Floor" value={form.floor} onChange={(e) => patch({ floor: e.target.value })} />
            </div>
          </section>

          <section className="dungeon-editor-section">
            <div className="dungeon-editor-section-header">
              <h3>Rooms</h3>
              <button type="button" className="dungeon-editor-add" onClick={() => patch({ rooms: addRoom(form.rooms) })}>
                Add Room
              </button>
            </div>
            {form.rooms.length === 0 && <p className="dungeon-editor-empty">No rooms added.</p>}
            {form.rooms.map((room) => (
              <div className="dungeon-editor-row-card" key={room.id}>
                <div className="dungeon-editor-row-grid">
                  <TextField label="Room ID" value={String(room.roomId)} disabled />
                  <TextField
                    label="Room Title"
                    value={room.title}
                    onChange={(e) =>
                      patch({ rooms: form.rooms.map((r) => (r.id === room.id ? { ...r, title: e.target.value } : r)) })
                    }
                  />
                </div>

                <div className="dungeon-editor-entries">
                  <div className="dungeon-editor-section-header">
                    <h4>Entries</h4>
                    <button
                      type="button"
                      className="dungeon-editor-add"
                      onClick={() =>
                        patch({
                          rooms: form.rooms.map((r) =>
                            r.id === room.id ? { ...r, entries: addRoomEntry(r.entries) } : r,
                          ),
                        })
                      }
                    >
                      Add Entry
                    </button>
                  </div>
                  {room.entries.map((entry) => (
                    <div className="dungeon-editor-entry-row" key={entry.id}>
                      <TextField
                        label="Entry Title"
                        value={entry.title}
                        onChange={(e) =>
                          patch({
                            rooms: form.rooms.map((r) =>
                              r.id === room.id
                                ? {
                                    ...r,
                                    entries: r.entries.map((en) =>
                                      en.id === entry.id ? { ...en, title: e.target.value } : en,
                                    ),
                                  }
                                : r,
                            ),
                          })
                        }
                      />
                      <TextField
                        label="Entry Content"
                        multiline
                        value={entry.content}
                        onChange={(e) =>
                          patch({
                            rooms: form.rooms.map((r) =>
                              r.id === room.id
                                ? {
                                    ...r,
                                    entries: r.entries.map((en) =>
                                      en.id === entry.id ? { ...en, content: e.target.value } : en,
                                    ),
                                  }
                                : r,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="dungeon-editor-row-remove"
                        onClick={() =>
                          patch({
                            rooms: form.rooms.map((r) =>
                              r.id === room.id ? { ...r, entries: r.entries.filter((en) => en.id !== entry.id) } : r,
                            ),
                          })
                        }
                      >
                        Remove Entry
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="dungeon-editor-row-remove"
                  onClick={() => patch({ rooms: form.rooms.filter((r) => r.id !== room.id) })}
                >
                  Remove Room
                </button>
              </div>
            ))}
          </section>

          <section className="dungeon-editor-section">
            <div className="dungeon-editor-section-header">
              <h3>Doors</h3>
              <button type="button" className="dungeon-editor-add" onClick={() => patch({ doors: addDoor(form.doors) })}>
                Add Door
              </button>
            </div>
            {form.doors.length === 0 && <p className="dungeon-editor-empty">No doors added.</p>}
            {form.doors.map((door) => (
              <div className="dungeon-editor-row-card" key={door.id}>
                <div className="dungeon-editor-row-grid">
                  <TextField label="Door ID" value={String(door.doorId)} disabled />
                  <TextField
                    label="Door Title"
                    value={door.title}
                    onChange={(e) =>
                      patch({ doors: form.doors.map((d) => (d.id === door.id ? { ...d, title: e.target.value } : d)) })
                    }
                  />
                  <TextField
                    label="Leads To (room IDs, comma-separated)"
                    value={door.leadsTo}
                    onChange={(e) =>
                      patch({
                        doors: form.doors.map((d) => (d.id === door.id ? { ...d, leadsTo: e.target.value } : d)),
                      })
                    }
                  />
                  <CheckboxField
                    label="Hidden"
                    checked={door.isHidden}
                    onChange={(e) =>
                      patch({
                        doors: form.doors.map((d) => (d.id === door.id ? { ...d, isHidden: e.target.checked } : d)),
                      })
                    }
                  />
                </div>
                <TextField
                  label="Content"
                  multiline
                  value={door.content}
                  onChange={(e) =>
                    patch({ doors: form.doors.map((d) => (d.id === door.id ? { ...d, content: e.target.value } : d)) })
                  }
                />
                <button
                  type="button"
                  className="dungeon-editor-row-remove"
                  onClick={() => patch({ doors: form.doors.filter((d) => d.id !== door.id) })}
                >
                  Remove Door
                </button>
              </div>
            ))}
          </section>

          <div className="dungeon-editor-actions">
            <button type="button" className="dungeon-editor-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dungeon-editor-save" disabled={saving}>
              {dungeon ? 'Save Changes' : 'Create Dungeon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
