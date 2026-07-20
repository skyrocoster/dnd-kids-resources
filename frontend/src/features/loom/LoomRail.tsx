import { useState, useRef, useEffect } from 'react'
import type { LoomNode, LoomTapestryThread } from '../../api/types'
import { Button } from '../../components/Button'
import { LoomBeatBankTray } from './LoomBeatBankTray'
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
  onPlaceNode?: (node: LoomNode) => void
  onReorderThread?: (threadId: number) => void
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

interface ActionItem {
  label: string
  onClick: () => void
  destructive?: boolean
}

function getActionConfig(
  node: LoomNode,
  props: {
    onEdit: () => void
    onDeleteNode: () => void
    onFulfilNode: (node: LoomNode) => void
    onBankNode: (node: LoomNode) => void
    onReplaceNode: (node: LoomNode) => void
    onSpawnThread: (node: LoomNode) => void
    onChangeEnding: (node: LoomNode) => void
    onUndoFulfil: (node: LoomNode) => void
    onPlaceNode?: (node: LoomNode) => void
    onReorderThread?: (threadId: number) => void
  },
): { primary: ActionItem | null; adjacent: ActionItem | null; moreItems: (ActionItem | 'separator')[] } {
  if (node.kind === 'start') {
    return { primary: null, adjacent: null, moreItems: [] }
  }

  if (node.kind === 'end') {
    return {
      primary: { label: 'Change Ending', onClick: () => props.onChangeEnding(node) },
      adjacent: null,
      moreItems: [],
    }
  }

  if (node.kind === 'beat' && node.thread_id != null) {
    const more: (ActionItem | 'separator')[] = []
    if (props.onReorderThread) {
      more.push({ label: 'Reorder planned beats…', onClick: () => props.onReorderThread!(node.thread_id!) })
    }
    more.push({ label: 'Bank Beat', onClick: () => props.onBankNode(node) })
    more.push({ label: 'Replace Beat…', onClick: () => props.onReplaceNode(node) })
    more.push('separator')
    more.push({ label: 'Delete Beat…', onClick: () => props.onDeleteNode(), destructive: true })
    return {
      primary: { label: 'Fulfil Beat', onClick: () => props.onFulfilNode(node) },
      adjacent: { label: 'Edit', onClick: () => props.onEdit() },
      moreItems: more,
    }
  }

  if (node.kind === 'beat' && node.thread_id == null) {
    return {
      primary: { label: 'Place Beat', onClick: () => props.onPlaceNode?.(node) },
      adjacent: { label: 'Edit', onClick: () => props.onEdit() },
      moreItems: [{ label: 'Delete Beat…', onClick: () => props.onDeleteNode(), destructive: true }],
    }
  }

  if (node.kind === 'session') {
    const more: (ActionItem | 'separator')[] = []
    if (node.fulfilled_planned_title) {
      more.push({ label: 'Undo fulfilment', onClick: () => props.onUndoFulfil(node) })
      more.push('separator')
    }
    more.push({ label: 'Delete thread entry…', onClick: () => props.onDeleteNode(), destructive: true })
    return {
      primary: { label: 'Spawn Thread', onClick: () => props.onSpawnThread(node) },
      adjacent: { label: 'Edit', onClick: () => props.onEdit() },
      moreItems: more,
    }
  }

  return { primary: null, adjacent: null, moreItems: [] }
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
  onPlaceNode,
  onReorderThread,
}: LoomRailProps) {
  const [bankDragOver, setBankDragOver] = useState(false)
  const [overflowOpen, setOverflowOpen] = useState(false)
  const overflowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!overflowOpen) return
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false)
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOverflowOpen(false)
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler)
      document.addEventListener('keydown', keyHandler)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [overflowOpen])
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
              {(() => {
                const config = getActionConfig(selectedNode, {
                  onEdit,
                  onDeleteNode,
                  onFulfilNode,
                  onBankNode,
                  onReplaceNode,
                  onSpawnThread,
                  onChangeEnding,
                  onUndoFulfil,
                  onPlaceNode,
                  onReorderThread,
                })
                return (
                  <>
                    {config.primary && (
                      <Button variant="primary" size="compact" onClick={config.primary.onClick}>
                        {config.primary.label}
                      </Button>
                    )}
                    {config.adjacent && (
                      <Button variant="secondary" size="compact" onClick={config.adjacent.onClick}>
                        {config.adjacent.label}
                      </Button>
                    )}
                    {config.moreItems.length > 0 && (
                      <div className="loom-overflow-wrap" ref={overflowRef}>
                        <Button
                          variant="secondary"
                          size="compact"
                          onClick={() => setOverflowOpen(!overflowOpen)}
                          aria-expanded={overflowOpen}
                          aria-haspopup="menu"
                        >
                          More actions
                        </Button>
                        {overflowOpen && (
                          <div className="loom-overflow-menu" role="menu">
                            {config.moreItems.map((item, i) =>
                              item === 'separator' ? (
                                <div key={`sep-${i}`} className="loom-overflow-separator" role="separator" />
                              ) : (
                                <button
                                  key={item.label}
                                  className={`loom-overflow-item${item.destructive ? ' loom-overflow-item--danger' : ''}`}
                                  role="menuitem"
                                  onClick={() => {
                                    item.onClick()
                                    setOverflowOpen(false)
                                  }}
                                >
                                  {item.label}
                                </button>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )
              })()}
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
          <p>Select a thread or node to inspect and edit it.</p>
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
