import { useState } from 'react'
import type { Condition } from '../../api/types'
import { TextField } from '../../components/form/TextField'
import { CloseIcon, UserPlusIcon } from '../../components/icons'
import { ConditionPicker } from './ConditionPicker'
import './AddPlayerPanel.css'

interface AddPlayerPanelProps {
  conditions: Condition[]
  onAdd: (name: string, conditions?: string[]) => void
  onClose: () => void
}

export function AddPlayerPanel({ conditions, onAdd, onClose }: AddPlayerPanelProps) {
  const [name, setName] = useState('')
  const [selectedConditions, setSelectedConditions] = useState<string[]>([])

  const trimmed = name.trim()
  const canAdd = trimmed.length > 0

  const handleAdd = () => {
    if (!canAdd) return
    onAdd(trimmed, selectedConditions.length > 0 ? selectedConditions : undefined)
  }

  return (
    <div className="add-player-panel">
      <div className="add-player-panel-header">
        <h3><UserPlusIcon size={18} aria-hidden /> Add player</h3>
        <button type="button" className="add-player-panel-close" onClick={onClose} aria-label="Close add player panel">
          <CloseIcon size={18} aria-hidden />
        </button>
      </div>
      <TextField
        label="Player name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && canAdd && handleAdd()}
        placeholder="Enter player name…"
        autoFocus
      />
      <ConditionPicker
        conditions={conditions}
        selected={selectedConditions}
        onChange={setSelectedConditions}
      />
      <div className="add-player-panel-actions">
        <button type="button" className="add-player-panel-cancel" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="add-player-panel-add" onClick={handleAdd} disabled={!canAdd}>
          Add
        </button>
      </div>
    </div>
  )
}
