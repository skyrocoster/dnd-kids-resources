import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Monster } from '../../api/types'
import { NextTurnIcon, PlusIcon } from '../../components/icons'
import type { UseEncounterRunnerResult } from './useEncounterRunner'
import { CombatantCard } from './CombatantCard'
import { AddMonsterPanel } from './AddMonsterPanel'
import './EncounterRunnerBoard.css'

interface EncounterRunnerBoardProps {
  runner: UseEncounterRunnerResult
  compact?: boolean
}

const SYNC_LABELS: Record<UseEncounterRunnerResult['syncStatus'], string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed',
}

export function EncounterRunnerBoard({ runner, compact = false }: EncounterRunnerBoardProps) {
  const [addMonsterOpen, setAddMonsterOpen] = useState(false)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const dragState = useRef<{ clientId: string; fromIndex: number } | null>(null)
  const [draggingClientId, setDraggingClientId] = useState<string | null>(null)

  const { state } = runner
  const { combatants, activeClientId, round } = state

  const handleAddMonster = (monster: Monster) => {
    runner.addFromMonster(monster)
  }

  const findDropIndex = (clientY: number): number => {
    let dropIndex = combatants.length - 1
    for (let i = 0; i < combatants.length; i++) {
      const el = cardRefs.current.get(combatants[i].clientId)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const midpoint = rect.top + rect.height / 2
      if (clientY < midpoint) {
        dropIndex = i
        break
      }
    }
    return dropIndex
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!dragState.current) return
    event.preventDefault()
  }

  const handlePointerUp = (event: PointerEvent) => {
    if (!dragState.current) return
    const { fromIndex } = dragState.current
    const toIndex = findDropIndex(event.clientY)
    if (toIndex !== fromIndex) runner.reorder(fromIndex, toIndex)
    dragState.current = null
    setDraggingClientId(null)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }

  const startDrag = (clientId: string, index: number) => (event: ReactPointerEvent) => {
    event.preventDefault()
    dragState.current = { clientId, fromIndex: index }
    setDraggingClientId(clientId)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  return (
    <div className={`encounter-runner-board ${compact ? 'compact' : ''}`}>
      <div className="encounter-runner-header">
        <span className="encounter-runner-round">Round {round}</span>
        <button type="button" className="encounter-runner-next-turn" onClick={runner.nextTurn}>
          <NextTurnIcon size={18} aria-hidden />
          Next turn
        </button>
        <span
          className={`encounter-runner-sync encounter-runner-sync-${runner.syncStatus}`}
          role="status"
          aria-live="polite"
        >
          {SYNC_LABELS[runner.syncStatus]}
        </span>
        <button
          type="button"
          className="encounter-runner-add-monster-toggle"
          onClick={() => setAddMonsterOpen((v) => !v)}
        >
          <PlusIcon size={16} aria-hidden />
          Add monster
        </button>
      </div>

      <div className="encounter-runner-body">
        <div className="encounter-runner-combatants">
          {combatants.length === 0 ? (
            <p className="encounter-runner-empty">No combatants yet — add a monster to begin.</p>
          ) : (
            combatants.map((combatant, index) => (
              <div
                key={combatant.clientId}
                ref={(el) => {
                  if (el) cardRefs.current.set(combatant.clientId, el)
                  else cardRefs.current.delete(combatant.clientId)
                }}
                className={draggingClientId === combatant.clientId ? 'combatant-card-dragging' : undefined}
              >
                <CombatantCard
                  combatant={combatant}
                  isActive={combatant.clientId === activeClientId}
                  index={index}
                  count={combatants.length}
                  conditions={runner.conditions}
                  onAdjustHp={(delta) => runner.adjustHp(combatant.clientId, delta)}
                  onSetHp={(hp) => runner.setHp(combatant.clientId, hp)}
                  onSetStatus={(status) => runner.setStatus(combatant.clientId, status)}
                  onSetConditions={(conditions) => runner.setConditions(combatant.clientId, conditions)}
                  onRename={(name) => runner.rename(combatant.clientId, name)}
                  onDuplicate={() => runner.duplicate(combatant.clientId)}
                  onRemove={() => runner.remove(combatant.clientId)}
                  onMoveUp={() => runner.moveUp(combatant.clientId)}
                  onMoveDown={() => runner.moveDown(combatant.clientId)}
                  onSetActive={() => runner.setActive(combatant.clientId)}
                  onDragHandlePointerDown={startDrag(combatant.clientId, index)}
                />
              </div>
            ))
          )}
        </div>

        {addMonsterOpen && (
          <AddMonsterPanel onAdd={handleAddMonster} onClose={() => setAddMonsterOpen(false)} />
        )}
      </div>
    </div>
  )
}
