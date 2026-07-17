import { useState } from 'react'
import type { LoomNode } from '../../api/types'
import { ChevronDownIcon, ChevronUpIcon } from '../../components/icons'

interface LoomVaultPanelProps {
  nodes: LoomNode[]
  onSelectNode: (node: LoomNode) => void
  onRestoreNode: (node: LoomNode) => void
  canRestore: boolean
}

/** Collapsible side panel listing unplaced beats (zero membership).
 * PB2 adds the Restore action. */
export function LoomVaultPanel({ nodes, onSelectNode, onRestoreNode, canRestore }: LoomVaultPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="loom-vault-panel" data-collapsed={collapsed || undefined}>
      <button
        type="button"
        className="loom-vault-panel-toggle"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <span>Beat Bank ({nodes.length})</span>
        {collapsed ? (
          <ChevronDownIcon width={16} height={16} aria-hidden="true" />
        ) : (
          <ChevronUpIcon width={16} height={16} aria-hidden="true" />
        )}
      </button>
      {!collapsed && (
        <ul className="loom-vault-panel-list">
          {nodes.length === 0 && <li className="loom-vault-panel-empty">No banked beats.</li>}
          {nodes.map((node) => (
            <li key={node.id}>
              <div className="loom-vault-panel-entry">
                <button type="button" className="loom-vault-panel-item" onClick={() => onSelectNode(node)}>
                  {node.title}
                </button>
                <button
                  type="button"
                  className="btn btn--compact btn--secondary"
                  onClick={() => onRestoreNode(node)}
                  disabled={!canRestore}
                  title={canRestore ? 'Restore to the focused thread' : 'Focus a thread to restore this beat'}
                >
                  Restore
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
