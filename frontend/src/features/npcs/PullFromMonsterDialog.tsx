import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Monster, NPC, NPCInput } from '../../api/types'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { CheckboxGroup } from '../../components/form/CheckboxGroup'
import { SearchList } from '../../components/SearchList'
import { StatePanel } from '../../components/StatePanel'
import { applyPull, getPullableRows } from './npcPull'
import type { PullRow } from './npcPull'
import './PullFromMonsterDialog.css'

interface PullFromMonsterDialogProps {
  npc: NPC
  onClose: () => void
  onPulled: (npc: NPC) => void
}

const REGION_ORDER: PullRow['region'][] = ['Stats', 'Defenses', 'Abilities', 'Actions', 'Lore']

export function PullFromMonsterDialog({ npc, onClose, onPulled }: PullFromMonsterDialogProps) {
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingMonsters, setLoadingMonsters] = useState(true)
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null)
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    api
      .listMonsters()
      .then((data) => {
        setMonsters([...data].sort((a, b) => a.name.localeCompare(b.name)))
        setLoadError(null)
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : 'Failed to load monsters.')
      })
      .finally(() => setLoadingMonsters(false))
  }, [])

  const handleMonsterSelect = (monster: Monster) => {
    setSelectedMonster(monster)
    setSelectedRowIds(new Set())
  }

  const handleCommit = async () => {
    if (!selectedMonster || selectedRowIds.size === 0) return
    setSaving(true)
    setStatus('Pulling fields…')
    const statblockFields = applyPull(npc, selectedMonster, selectedRowIds)
    const input: NPCInput = {
      name: npc.name,
      race: npc.race ?? null,
      gender: npc.gender ?? null,
      background: npc.background ?? null,
      appearance: npc.appearance ?? null,
      notes: npc.notes ?? null,
      ...statblockFields,
    }
    try {
      const saved = await api.updateNPC(npc.id, input)
      onPulled(saved)
      onClose()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to pull fields.')
      setSaving(false)
    }
  }

  const rows = selectedMonster ? getPullableRows(selectedMonster, npc) : []
  const grouped: Record<string, PullRow[]> = {}
  for (const row of rows) {
    if (!grouped[row.region]) grouped[row.region] = []
    grouped[row.region].push(row)
  }

  const searchListStatus = loadingMonsters ? 'loading' : loadError ? 'error' : 'ready'

  return (
    <Dialog
      open
      title={`Pull from monster: ${npc.name}`}
      onClose={onClose}
      pending={saving}
      className="pull-from-monster-dialog"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedMonster || selectedRowIds.size === 0}
            loading={saving}
            onClick={handleCommit}
          >
            Pull {selectedRowIds.size} selected
          </Button>
          {status && (
            <p role="status" className="pull-from-monster-footer-status">
              {status}
            </p>
          )}
        </>
      }
    >
      <div className="pull-from-monster-body">
        <div className="pull-from-monster-list">
          <SearchList
            items={monsters}
            getId={(m) => m.id}
            getLabel={(m) => m.name}
            getMeta={(m) => (m.cr ? `CR ${m.cr}` : undefined)}
            selectedId={selectedMonster?.id ?? null}
            onSelect={handleMonsterSelect}
            variant="monster"
            searchPlaceholder="Search monsters…"
            emptyMessage="No monsters match your search."
            status={searchListStatus}
          />
        </div>

        {loadError && (
          <div className="pull-from-monster-tree">
            <StatePanel status="error" message={loadError} />
          </div>
        )}

        {!loadError && !selectedMonster && (
          <div className="pull-from-monster-tree">
            <p className="pull-from-monster-empty">Choose a monster to see what you can pull.</p>
          </div>
        )}

        {!loadError && selectedMonster && (
          <div className="pull-from-monster-tree">
            {REGION_ORDER.map((region) => {
              const regionRows = grouped[region]
              if (!regionRows) return null
              return (
                  <section key={region} className="pull-from-monster-region">
                    <h3 className="pull-from-monster-region-title">{region}</h3>
                    <CheckboxGroup
                      className="pull-from-monster-checkbox-group"
                      label={<span className="fc-visually-hidden">{region} fields</span>}
                      options={regionRows.map((row) => ({
                        value: row.id,
                        label: (
                          <>
                            <span className="pull-from-monster-row-label">{row.label}</span>
                            {row.currentValueLabel && (
                              <span className="pull-from-monster-row-existing">
                                ← you have {row.currentValueLabel}
                              </span>
                            )}
                          </>
                        ),
                      }))}
                      value={regionRows.filter((row) => selectedRowIds.has(row.id)).map((row) => row.id)}
                      onValueChange={(regionSelection) => {
                        const regionRowIds = new Set(regionRows.map((row) => row.id))
                        setSelectedRowIds((previous) => {
                          const next = new Set([...previous].filter((id) => !regionRowIds.has(id)))
                          regionSelection.forEach((id) => next.add(id))
                          return next
                        })
                      }}
                    />
                  </section>
              )
            })}
            {rows.length === 0 && (
              <p className="pull-from-monster-empty">This monster has no fields to pull.</p>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}
