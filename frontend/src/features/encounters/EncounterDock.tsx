import { FloatingWindow } from '../../components/FloatingWindow'
import { useEncounterRunner } from './useEncounterRunner'
import { EncounterRunnerBoard } from './EncounterRunnerBoard'

export function EncounterDock({ encounterId, onClose }: { encounterId: number; onClose: () => void }) {
  const runner = useEncounterRunner(encounterId)

  return (
    <FloatingWindow
      title={runner.loading ? 'Loading…' : runner.title}
      storageKey="dungeon-encounter-dock-position"
      onClose={onClose}
    >
      {!runner.loading && <EncounterRunnerBoard runner={runner} compact />}
    </FloatingWindow>
  )
}
