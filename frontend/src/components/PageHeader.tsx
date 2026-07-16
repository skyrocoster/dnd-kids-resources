import type { ReactNode } from 'react'
import './PageHeader.css'

interface ChapterTab {
  key: string
  label: string
  icon: ReactNode
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  chapterTabs?: ChapterTab[]
  activeTab?: string
  onTabSelect?: (key: string) => void
  actions?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  chapterTabs,
  activeTab,
  onTabSelect,
  actions,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-main">
        <div className="page-header-titles">
          <h1 className="page-header-title">{title}</h1>
          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
      {chapterTabs && chapterTabs.length > 0 && (
        <nav className="page-header-tabs" aria-label="Content sections">
          {chapterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`page-header-tab ${activeTab === tab.key ? 'page-header-tab--active' : ''}`}
              aria-selected={activeTab === tab.key}
              role="tab"
              onClick={() => onTabSelect?.(tab.key)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      )}
    </header>
  )
}
