import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { navSections } from '../layout/navSections'
import './HomePage.css'

export function HomePage() {
  const [activeSection, setActiveSection] = useState(navSections[0].label)
  const section = navSections.find((s) => s.label === activeSection) ?? navSections[0]

  return (
    <div className="home-page">
      <PageHeader
        title="Field Guide"
        subtitle="Pick a chapter, then jump straight to the tools you need at the table."
        chapterTabs={navSections.map((s) => ({
          key: s.label,
          label: s.label,
          icon: <s.icon size={18} aria-hidden="true" />,
        }))}
        activeTab={activeSection}
        onTabSelect={setActiveSection}
      />
      <div className="home-page-grid">
        {section.links.map((link) => (
          <Link key={link.to} to={link.to} className="home-page-card">
            <link.linkIcon size={28} aria-hidden="true" />
            <span className="home-page-card-label">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
