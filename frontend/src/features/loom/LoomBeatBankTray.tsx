import { useState } from 'react'
import type { LoomNode, LoomThread } from '../../api/types'
import { ChevronDownIcon, ChevronUpIcon } from '../../components/icons'
import { Button } from '../../components/Button'

interface LoomBeatBankTrayProps {
  nodes: LoomNode[]
  threads: LoomThread[]
  onSelectNode: (node: LoomNode) => void
  onRestoreNode: (node: LoomNode, threadId: number) => void
  onActivateNode?: (node: LoomNode) => void
  onManageThreads?: () => void
}

export function LoomBeatBankTray({
  nodes,
  threads,
  onSelectNode: _onSelectNode,
  onRestoreNode: _onRestoreNode,
  onActivateNode,
  onManageThreads,
}: LoomBeatBankTrayProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [guardVisible, setGuardVisible] = useState(false)

  return (
    <div className="loom-beat-bank-tray" role="region" aria-label="Beat Bank">
      <button
        type="button"
        className="loom-beat-bank-tray-toggle"
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
        <div className="loom-beat-bank-tray-content">
          {guardVisible && (
            <div className="loom-beat-bank-tray-guard" role="alert">
              <p>Create a thread before placing this beat.</p>
              <Button variant="secondary" size="compact" onClick={onManageThreads}>
                Manage Threads
              </Button>
            </div>
          )}
          {nodes.length === 0 && <p className="loom-beat-bank-tray-empty">No banked beats.</p>}
          {nodes.map((node) => {
            const handleDragStart = (e: React.DragEvent) => {
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData(
                'application/json',
                JSON.stringify({ action: 'restore', nodeId: node.id }),
              )
            }
            const handleActivate = () => {
              if (threads.length === 0) {
                setGuardVisible(true)
                return
              }
              onActivateNode?.(node)
            }
            return (
            <div
              key={node.id}
              className="loom-beat-bank-tray-entry"
              draggable
              onDragStart={handleDragStart}
              onClick={handleActivate}
              role="button"
              tabIndex={0}
              aria-label={node.title}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleActivate()
                }
              }}
            >
              <span className="loom-beat-bank-tray-item">{node.title}</span>
            </div>
          ); })}
        </div>
      )}
    </div>
  )
}
