import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { StatePanel } from '../../components/StatePanel'
import { useEncounterRunner } from './useEncounterRunner'
import { EncounterRunnerBoard } from './EncounterRunnerBoard'
import './EncounterRunnerPage.css'

export function EncounterRunnerPage() {
  const { id: idStr } = useParams()
  const navigate = useNavigate()
  const encounterId = idStr ? Number(idStr) : NaN

  const runner = useEncounterRunner(encounterId)

  if (Number.isNaN(encounterId)) {
    return (
      <div className="encounter-runner-page">
        <p className="encounter-runner-page-error">No encounter specified.</p>
        <button type="button" className="dungeon-back-button" onClick={() => navigate('/encounters')}>
          Back to encounters
        </button>
      </div>
    )
  }

  return (
    <div className="encounter-runner-page">
      <PageHeader
        title={runner.loading ? 'Loading…' : runner.title}
        actions={
        <button type="button" className="dungeon-back-button" onClick={() => navigate('/encounters')}>
          Back to encounters
        </button>
        }
      />

      {runner.loadError && (
        <StatePanel
          status="error"
          title="Error loading encounter"
          message={runner.loadError}
          action={<button type="button" onClick={() => window.location.reload()}>Retry</button>}
        />
      )}
      {!runner.loading && !runner.loadError && <EncounterRunnerBoard runner={runner} />}
    </div>
  )
}
