import type { ReactNode } from 'react'
import './StatePanel.css'

export type PanelStatus = 'loading' | 'empty' | 'filteredEmpty' | 'error' | 'noSelection'

interface StatePanelProps {
  status: PanelStatus
  title?: string
  message?: string
  action?: ReactNode
}

const defaultCopy: Record<PanelStatus, { title: string; message: string }> = {
  loading: { title: 'Loading…', message: 'Fetching data.' },
  empty: { title: 'Nothing here yet', message: 'Create something to get started.' },
  filteredEmpty: { title: 'No matches', message: 'Try adjusting your search or filters.' },
  error: { title: 'Something went wrong', message: 'Try again or check your connection.' },
  noSelection: { title: 'Select an item', message: 'Choose from the list to view details.' },
}

export function StatePanel({ status, title, message, action }: StatePanelProps) {
  const copy = defaultCopy[status]
  return (
    <div className={`state-panel state-panel--${status}`} role="status" aria-live="polite">
      {status === 'loading' && <div className="state-panel-spinner" aria-hidden="true" />}
      <h3 className="state-panel-title">{title || copy.title}</h3>
      <p className="state-panel-message">{message || copy.message}</p>
      {action && <div className="state-panel-action">{action}</div>}
    </div>
  )
}
