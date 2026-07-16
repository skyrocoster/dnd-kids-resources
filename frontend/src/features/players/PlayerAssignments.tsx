import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Spell, Weapon } from '../../api/types'
import { SelectField } from '../../components/form/SelectField'

interface SpellAssignmentProps {
  playerId: number
}

export function SpellAssignment({ playerId }: SpellAssignmentProps) {
  const [assigned, setAssigned] = useState<Spell[]>([])
  const [allSpells, setAllSpells] = useState<Spell[]>([])
  const [pendingId, setPendingId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadAssigned = () => {
    api
      .getPlayerSpells(playerId)
      .then((spells) => setAssigned([...spells].sort((a, b) => a.name.localeCompare(b.name))))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load spells.'))
  }

  useEffect(loadAssigned, [playerId])
  useEffect(() => {
    api
      .listSpells()
      .then((spells) => setAllSpells(spells))
      .catch(() => setAllSpells([]))
  }, [])

  const available = allSpells
    .filter((s) => !assigned.some((a) => a.id === s.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  const handleAdd = async () => {
    if (!pendingId) return
    try {
      await api.assignPlayerSpell(playerId, Number(pendingId))
      setPendingId('')
      loadAssigned()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign spell.')
    }
  }

  const handleRemove = async (spellId: number) => {
    try {
      await api.unassignPlayerSpell(playerId, spellId)
      loadAssigned()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove spell.')
    }
  }

  return (
    <div className="player-assignment">
      <h4>Spells</h4>
      {error && <p className="player-assignment-error">{error}</p>}
      {assigned.length === 0 ? (
        <p className="player-assignment-empty">No spells assigned.</p>
      ) : (
        <ul className="player-assignment-list">
          {assigned.map((spell) => (
            <li key={spell.id}>
              <span>{spell.name}</span>
              <button type="button" onClick={() => handleRemove(spell.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {available.length > 0 && (
        <div className="player-assignment-add">
          <SelectField
            label="Add Spell"
            value={pendingId}
            onChange={(e) => setPendingId(e.target.value)}
            options={available.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="Choose a spell…"
          />
          <button type="button" onClick={handleAdd} disabled={!pendingId}>
            Add
          </button>
        </div>
      )}
    </div>
  )
}

interface WeaponAssignmentProps {
  playerId: number
}

export function WeaponAssignment({ playerId }: WeaponAssignmentProps) {
  const [assigned, setAssigned] = useState<Weapon[]>([])
  const [allWeapons, setAllWeapons] = useState<Weapon[]>([])
  const [pendingId, setPendingId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadAssigned = () => {
    api
      .getPlayerWeapons(playerId)
      .then((weapons) => setAssigned([...weapons].sort((a, b) => a.name.localeCompare(b.name))))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load weapons.'))
  }

  useEffect(loadAssigned, [playerId])
  useEffect(() => {
    api
      .listWeapons()
      .then((weapons) => setAllWeapons(weapons))
      .catch(() => setAllWeapons([]))
  }, [])

  const available = allWeapons
    .filter((w) => !assigned.some((a) => a.id === w.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  const handleAdd = async () => {
    if (!pendingId) return
    try {
      await api.assignPlayerWeapon(playerId, Number(pendingId))
      setPendingId('')
      loadAssigned()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign weapon.')
    }
  }

  const handleRemove = async (weaponId: number) => {
    try {
      await api.unassignPlayerWeapon(playerId, weaponId)
      loadAssigned()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove weapon.')
    }
  }

  return (
    <div className="player-assignment">
      <h4>Weapons</h4>
      {error && <p className="player-assignment-error">{error}</p>}
      {assigned.length === 0 ? (
        <p className="player-assignment-empty">No weapons assigned.</p>
      ) : (
        <ul className="player-assignment-list">
          {assigned.map((weapon) => (
            <li key={weapon.id}>
              <span>{weapon.name}</span>
              <button type="button" onClick={() => handleRemove(weapon.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {available.length > 0 && (
        <div className="player-assignment-add">
          <SelectField
            label="Add Weapon"
            value={pendingId}
            onChange={(e) => setPendingId(e.target.value)}
            options={available.map((w) => ({ value: String(w.id), label: w.name }))}
            placeholder="Choose a weapon…"
          />
          <button type="button" onClick={handleAdd} disabled={!pendingId}>
            Add
          </button>
        </div>
      )}
    </div>
  )
}
