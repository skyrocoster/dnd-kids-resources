import { TrashIcon } from '../../../components/icons'

interface SelectionActionsProps {
  deleteLabel: string
  onDelete: () => void
  onClose: () => void
}

export function SelectionActions({ deleteLabel, onDelete, onClose }: SelectionActionsProps) {
  return (
    <div className="maplab-inspector-actions" role="group" aria-label="Selection actions">
      <button type="button" className="maplab-pill-button maplab-editor-toolbar-button" onClick={onDelete}>
        <TrashIcon width={16} height={16} aria-hidden="true" />
        {deleteLabel}
      </button>
      <button type="button" className="maplab-pill-button maplab-editor-toolbar-button" onClick={onClose}>
        Close
      </button>
    </div>
  )
}
