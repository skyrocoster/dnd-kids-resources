import type { ReactNode } from 'react'
import { PageHeader } from './PageHeader'
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
  chapterIcon?: ReactNode
  detailOpen?: boolean
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
  chapterIcon,
  detailOpen = false,
}: BrowserLayoutProps) {
  return (
    <div className={`browser-layout ${detailOpen ? 'browser-layout--detail-open' : ''}`}>
      <PageHeader
        title={title}
        actions={actions}
        chapterTabs={chapterIcon ? [{ key: title, label: title, icon: chapterIcon }] : undefined}
        activeTab={chapterIcon ? title : undefined}
      />

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
