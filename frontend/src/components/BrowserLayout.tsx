import type { ReactNode } from 'react'
import { SplitPane } from './SplitPane'
import './BrowserLayout.css'

interface BrowserLayoutProps {
  title: string
  actions?: ReactNode
  error?: string | null
  list: ReactNode
  detail: ReactNode
  editor?: ReactNode
  dialog?: ReactNode
  listLabel?: string
}

export function BrowserLayout({
  title,
  actions,
  error,
  list,
  detail,
  editor,
  dialog,
  listLabel,
}: BrowserLayoutProps) {
  return (
    <div className="browser-layout">
      <div className="browser-layout-toolbar">
        <h2 className="browser-layout-title">{title}</h2>
        {actions && <div className="browser-layout-actions">{actions}</div>}
      </div>

      {error && <p className="browser-layout-error" role="alert">{error}</p>}

      <div className="browser-layout-split">
        <SplitPane
          leftLabel={listLabel || `${title} list`}
          left={list}
          right={detail}
        />
      </div>

      {editor}
      {dialog}
    </div>
  )
}
