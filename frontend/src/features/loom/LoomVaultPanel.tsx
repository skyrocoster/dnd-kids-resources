import { useState } from 'react'
import type { LoomNode } from '../../api/types'
import { ChevronDownIcon, ChevronUpIcon } from '../../components/icons'

interface LoomVaultPanelProps {
  nodes: LoomNode[]
  onSelectNode: (node: LoomNode) => void
}

/** Collapsible side panel listing unwired nodes (degree 0). Vault nodes stay
 * rendered on-canvas at their stored x/y as well — this panel is a navigation
 * shortcut, not their only home. */
export function LoomVaultPanel({ nodes, onSelectNode }: LoomVaultPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="loom-vault-panel" data-collapsed={collapsed || undefined}>
      <button
        type="button"
        className="loom-vault-panel-toggle"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <span>Idea Vault ({nodes.length})</span>
        {collapsed ? (
          <ChevronDownIcon width={16} height={16} aria-hidden="true" />
        ) : (
          <ChevronUpIcon width={16} height={16} aria-hidden="true" />
        )}
      </button>
      {!collapsed && (
        <ul className="loom-vault-panel-list">
          {nodes.length === 0 && <li className="loom-vault-panel-empty">Nothing unwired.</li>}
          {nodes.map((node) => (
            <li key={node.id}>
              <button type="button" className="loom-vault-panel-item" onClick={() => onSelectNode(node)}>
                {node.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
