import type { ComponentProps } from 'react'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { FloatingWindow } from '../../../components/FloatingWindow'
import { EncounterDock } from '../../encounters/EncounterDock'
import { NPCStatCard } from '../../npcs/NPCStatCard'
import { StatePanel } from '../../../components/StatePanel'
import { useNpc } from '../../npcs/useNpc'
import { InspectorPanel, type ObstacleInspectorAdapter } from './InspectorPanel'
import { RoomDetailsPanel } from './RoomDetailsPanel'
import type { Inspectable, MapLayout } from '../../../model/maplabModel'

type RoomDetailsProps = ComponentProps<typeof RoomDetailsPanel>

interface MapLabViewerOverlaysProps {
  activeInspectable: Inspectable | null
  activeAdapter: ObstacleInspectorAdapter | undefined
  otherDungeonTitles: Record<number, string>
  activeLayoutRoom: RoomDetailsProps['room']
  activeDungeonRoom: RoomDetailsProps['dungeonRoom']
  parsed: RoomDetailsProps['parsed']
  dungeonId: number
  layout: MapLayout
  onRunEncounter: NonNullable<RoomDetailsProps['onRunEncounter']>
  onOpenNpc: NonNullable<RoomDetailsProps['onOpenNpc']>
  onPartyIsHere: NonNullable<RoomDetailsProps['onPartyIsHere']>
  actionError: RoomDetailsProps['actionError']
  clearActionError: NonNullable<RoomDetailsProps['clearActionError']>
  activeEncounterId: number | null
  onCloseEncounter: () => void
  activeNpcId: number | null
  onCloseNpc: () => void
  resetDungeonConfirmOpen: boolean
  dungeonTitle: string | undefined
  onConfirmReset: () => void
  onCancelReset: () => void
}

export function MapLabViewerOverlays({
  activeInspectable,
  activeAdapter,
  otherDungeonTitles,
  activeLayoutRoom,
  activeDungeonRoom,
  parsed,
  dungeonId,
  layout,
  onRunEncounter,
  onOpenNpc,
  onPartyIsHere,
  actionError,
  clearActionError,
  activeEncounterId,
  onCloseEncounter,
  activeNpcId,
  onCloseNpc,
  resetDungeonConfirmOpen,
  dungeonTitle,
  onConfirmReset,
  onCancelReset,
}: MapLabViewerOverlaysProps) {
  return (
    <>
      {activeInspectable ? <aside className="maplab-sidebar" aria-label="Selected details">
         <div className="maplab-inspector-panel-container" aria-live="polite">
          <InspectorPanel
            target={activeInspectable}
            adapter={activeAdapter}
            context={
              activeInspectable.kind === 'portal' && activeInspectable.portal.to?.dungeon_id !== undefined
                ? { dungeonTitle: otherDungeonTitles[activeInspectable.portal.to.dungeon_id] }
                : undefined
            }
          />
        </div>
        <RoomDetailsPanel
          room={activeLayoutRoom}
          dungeonRoom={activeDungeonRoom}
          parsed={parsed}
          dungeonId={dungeonId}
          layout={layout}
          onRunEncounter={onRunEncounter}
          onOpenNpc={onOpenNpc}
          onPartyIsHere={onPartyIsHere}
          actionError={actionError}
          clearActionError={clearActionError}
        />
      </aside> : null}

      {activeEncounterId != null && <EncounterDock encounterId={activeEncounterId} onClose={onCloseEncounter} />}
      {activeNpcId != null && <NpcDock npcId={activeNpcId} onClose={onCloseNpc} />}

      {resetDungeonConfirmOpen && (
        <ConfirmDialog
          message={`Reset "${dungeonTitle}"? Every door, trap, and toggle returns to its authored state. This cannot be undone.`}
          confirmLabel="Reset"
          onConfirm={onConfirmReset}
          onCancel={onCancelReset}
        />
      )}
    </>
  )
}

function NpcDock({ npcId, onClose }: { npcId: number; onClose: () => void }) {
  const { npc, loading, error } = useNpc(npcId)

  return (
    <FloatingWindow
      title={loading ? 'Loading…' : npc?.name ?? `NPC #${npcId}`}
      storageKey="dungeon-npc-dock-position"
      onClose={onClose}
    >
      {loading && <StatePanel status="loading" message="Loading NPC…" />}
      {!loading && error && <StatePanel status="error" message={error} />}
      {!loading && npc && <NPCStatCard npc={npc} compact />}
    </FloatingWindow>
  )
}
