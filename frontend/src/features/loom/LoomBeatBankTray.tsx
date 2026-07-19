import { useState } from 'react'
import type { LoomNode, LoomThread } from '../../api/types'
import { Button } from '../../components/Button'
import { ChevronDownIcon, ChevronUpIcon } from '../../components/icons'

interface LoomBeatBankTrayProps {
  nodes: LoomNode[]
  threads: LoomThread[]
  onSelectNode: (node: LoomNode) => void
  onRestoreNode: (node: LoomNode, threadId: number) => void
}

export function LoomBeatBankTray({ nodes, threads, onSelectNode, onRestoreNode }: LoomBeatBankTrayProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [restoringNodeId, setRestoringNodeId] = useState<number | null>(null)
  const [selectedThreadId, setSelectedThreadId] = useState<number>(threads[0]?.id ?? 0)

  const handleConfirmRestore = () => {
    if (restoringNodeId == null || selectedThreadId === 0) return
    const node = nodes.find((n) => n.id === restoringNodeId)
    if (!node) return
    onRestoreNode(node, selectedThreadId)
    setRestoringNodeId(null)
    setSelectedThreadId(threads[0]?.id ?? 0)
  }

  const handleCancelRestore = () => {
    setRestoringNodeId(null)
    setSelectedThreadId(threads[0]?.id ?? 0)
  }

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
          {nodes.length === 0 && <p className="loom-beat-bank-tray-empty">No banked beats.</p>}
          {nodes.map((node) => (
            <div key={node.id} className="loom-beat-bank-tray-entry">
              <button
                type="button"
                className="loom-beat-bank-tray-item"
                onClick={() => onSelectNode(node)}
              >
                {node.title}
              </button>
              {restoringNodeId === node.id ? (
                <div className="loom-beat-bank-tray-restore-picker">
                  <label className="loom-beat-bank-tray-restore-label" htmlFor={`tray-thread-${node.id}`}>
                    Restore to:
                  </label>
                  <select
                    id={`tray-thread-${node.id}`}
                    className="loom-beat-bank-tray-thread-select"
                    value={selectedThreadId}
                    onChange={(e) => setSelectedThreadId(Number(e.target.value))}
                  >
                    {threads.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <Button variant="primary" size="compact" onClick={handleConfirmRestore}>
                    Confirm
                  </Button>
                  <Button variant="secondary" size="compact" onClick={handleCancelRestore}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="compact"
                  onClick={() => {
                    setRestoringNodeId(node.id)
                    setSelectedThreadId(threads[0]?.id ?? 0)
                  }}
                  disabled={threads.length === 0}
                  title={threads.length > 0 ? 'Restore this beat to a thread' : 'No threads to restore to'}
                >
                  Restore
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
