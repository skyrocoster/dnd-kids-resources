import { useState } from 'react'
import type { LoomNode, LoomTapestryThread } from '../../api/types'
import { Button } from '../../components/Button'
import { LoomBeatBankTray } from './LoomBeatBankTray'
import { LoomLegend } from './LoomLegend'
import { threadOrdered } from './loomGraph'

export interface LoomRailProps {
  selectedNode: LoomNode | null
  threads: LoomTapestryThread[]
  selectedThreadId?: number | null
  onSelectThread?: (threadId: number) => void
  onEdit: () => void
  onDeleteNode: () => void
  onFulfilNode: (node: LoomNode) => void
  onBankNode: (node: LoomNode) => void
  onBankNodeById?: (nodeId: number) => void
  onReplaceNode: (node: LoomNode) => void
  onSpawnThread: (node: LoomNode) => void
  onChangeEnding: (node: LoomNode) => void
  onUndoFulfil: (node: LoomNode) => void
  nodes: LoomNode[]
  onSelectNode: (node: LoomNode) => void
  onRestoreNode: (node: LoomNode, threadId: number) => void
  onEditThread?: (threadId: number) => void
  onActivateNode?: (node: LoomNode) => void
  onManageThreads?: () => void
}

function kindLabel(node: LoomNode): string {
  switch (node.kind) {
    case 'start':
      return 'Start'
    case 'end':
      return 'End'
    case 'beat':
      return node.thread_id == null ? 'Banked Beat' : 'Story Beat'
    case 'session':
      return 'Session'
  }
}

function excerpt(body: string | null | undefined): string | null {
  if (!body) return null
  const compact = body.trim().replace(/\s+/g, ' ')
  if (!compact) return null
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact
}

export function LoomRail({
  selectedNode,
  threads,
  selectedThreadId,
  onEdit,
  onDeleteNode,
  onFulfilNode,
  onBankNode,
  onBankNodeById,
  onReplaceNode,
  onSpawnThread,
  onChangeEnding,
  onUndoFulfil,
  nodes,
  onSelectNode,
  onRestoreNode,
  onEditThread,
  onActivateNode,
  onManageThreads,
}: LoomRailProps) {
  const [bankDragOver, setBankDragOver] = useState(false)
  const threadNamesById = new Map(threads.map((thread) => [thread.id, thread.name]))
  const selectedThreadName =
    selectedNode?.thread_id != null ? threadNamesById.get(selectedNode.thread_id) ?? null : null
  const selectedThread = selectedThreadId != null ? threads.find((t) => t.id === selectedThreadId) : null

  return (
    <aside className="loom-weaver-panel" aria-label="Weaver's panel">
      <section className="loom-weaver-section">
        <div className="loom-weaver-section-heading">
          <h2 className="loom-weaver-section-title">Inspector</h2>
        </div>

        {selectedNode ? (
          <div className="loom-selection-stack">
            <div className="loom-selection-header">
              <h3 className="loom-selection-title">{selectedNode.title}</h3>
              <div className="loom-selection-meta" aria-label="Node details">
                <span className="loom-selection-pill" data-tone={selectedNode.kind}>
                  <span className="loom-selection-pill-glyph" aria-hidden="true">
                    {selectedNode.kind === 'start' || selectedNode.kind === 'end' ? '◇' : selectedNode.kind === 'beat' ? '◆' : '●'}
                  </span>
                  {kindLabel(selectedNode)}
                </span>
              </div>
            </div>

            <dl className="loom-selection-details">
              <div>
                <dt>Weft</dt>
                <dd>{selectedThreadName ?? 'Unthreaded'}</dd>
              </div>
              {selectedNode.banked_from_thread_id != null && (
                <div>
                  <dt>Banked from</dt>
                  <dd>{threadNamesById.get(selectedNode.banked_from_thread_id) ?? 'a retired thread'}</dd>
                </div>
              )}
              <div>
                <dt>Notes</dt>
                <dd>{excerpt(selectedNode.body) || 'No notes yet.'}</dd>
              </div>
            </dl>

            <div className="loom-selection-actions">
              {selectedNode.kind !== 'start' && selectedNode.kind !== 'end' && (
                <Button variant="secondary" size="compact" onClick={onEdit}>
                  Edit
                </Button>
              )}
              {selectedNode.kind === 'beat' && selectedNode.thread_id != null && (
                <>
                  <Button variant="primary" size="compact" onClick={() => onFulfilNode(selectedNode)}>
                    Fulfil Beat
                  </Button>
                  <Button variant="secondary" size="compact" onClick={() => onBankNode(selectedNode)}>
                    Bank Beat
                  </Button>
                  <Button variant="secondary" size="compact" onClick={() => onReplaceNode(selectedNode)}>
                    Replace Beat
                  </Button>
                </>
              )}
              {selectedNode.kind === 'session' && (
                <Button variant="secondary" size="compact" onClick={() => onSpawnThread(selectedNode)}>
                  Spawn Thread
                </Button>
              )}
              {selectedNode.kind === 'end' && (
                <Button variant="secondary" size="compact" onClick={() => onChangeEnding(selectedNode)}>
                  Change Ending
                </Button>
              )}
              {selectedNode.kind === 'session' && selectedNode.fulfilled_planned_title && (
                <Button variant="secondary" size="compact" onClick={() => onUndoFulfil(selectedNode)}>
                  Undo Fulfil
                </Button>
              )}
              {selectedNode.kind !== 'start' && selectedNode.kind !== 'end' && (
                <Button variant="danger" size="compact" onClick={onDeleteNode}>
                  Delete
                </Button>
              )}
            </div>
          </div>
        ) : selectedThread ? (
          <div className="loom-selection-stack">
            <div className="loom-selection-header">
              <h3 className="loom-selection-title">{selectedThread.name}</h3>
            </div>
            <span className="loom-weaver-thread-swatch" data-color={selectedThread.color} />
            {selectedThread.description && <p>{selectedThread.description}</p>}
            <p>{threadOrdered(selectedThread, nodes).length} nodes</p>
            <div className="loom-selection-actions">
              <Button variant="secondary" size="compact" onClick={() => onEditThread?.(selectedThread.id)}>
                Edit Thread
              </Button>
            </div>
          </div>
        ) : (
          <LoomLegend />
        )}
      </section>

      <section
        className={`loom-weaver-section${bankDragOver ? ' loom-weaver-section--drag-over' : ''}`}
        onDragOver={(e) => {
          const raw = e.dataTransfer.getData('application/json')
          if (!raw) return
          try {
            const data = JSON.parse(raw)
            if (data.action === 'reorder' && data.nodeKind === 'beat') {
              e.preventDefault()
              setBankDragOver(true)
            }
          } catch { /* ignore */ }
        }}
        onDragLeave={() => setBankDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setBankDragOver(false)
          const raw = e.dataTransfer.getData('application/json')
          if (!raw) return
          try {
            const data = JSON.parse(raw)
            if (data.action === 'reorder' && data.nodeKind === 'beat' && onBankNodeById) {
              onBankNodeById(data.nodeId as number)
            }
          } catch { /* ignore */ }
        }}
      >
        <div className="loom-weaver-section-heading">
          <h2 className="loom-weaver-section-title">Beat Bank</h2>
        </div>
        <LoomBeatBankTray
          nodes={nodes}
          threads={threads}
          onSelectNode={onSelectNode}
          onRestoreNode={onRestoreNode}
          onActivateNode={onActivateNode}
          onManageThreads={onManageThreads}
        />
      </section>
    </aside>
  )
}
