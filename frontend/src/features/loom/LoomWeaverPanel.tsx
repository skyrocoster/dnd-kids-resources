import type { LoomNode, LoomThread } from '../../api/types'
import { Button } from '../../components/Button'
import { LoomLegend } from './LoomLegend'
import { LoomVaultPanel } from './LoomVaultPanel'

export interface LoomWeaverPanelProps {
  selectedNode: LoomNode | null
  threads: LoomThread[]
  threadCounts: Record<number, number>
  bankedNodes: LoomNode[]
  focusedThreadId: number | null
  onEdit: () => void
  onDeleteNode: () => void
  onSelectBankedNode: (node: LoomNode) => void
  onRestoreNode: (node: LoomNode) => void
  onFulfilNode: (node: LoomNode) => void
  onBankNode: (node: LoomNode) => void
  onReplaceNode: (node: LoomNode) => void
  onSpawnThread: (node: LoomNode) => void
  onChangeEnding: (node: LoomNode) => void
  onUndoFulfil: (node: LoomNode) => void
  onOpenThreadManager: () => void
  onFocusThread: (threadId: number) => void
  onClearThreadFocus: () => void
}

function kindLabel(node: LoomNode): string {
  switch (node.kind) {
    case 'start':
      return 'Start'
    case 'end':
      return 'End'
    case 'beat':
      return node.thread_ids.length === 0 ? 'Banked Beat' : 'Story Beat'
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

export function LoomWeaverPanel({
  selectedNode,
  threads,
  threadCounts,
  bankedNodes,
  focusedThreadId,
  onEdit,
  onDeleteNode,
  onSelectBankedNode,
  onRestoreNode,
  onFulfilNode,
  onBankNode,
  onReplaceNode,
  onSpawnThread,
  onChangeEnding,
  onUndoFulfil,
  onOpenThreadManager,
  onFocusThread,
  onClearThreadFocus,
}: LoomWeaverPanelProps) {
  const threadNamesById = new Map(threads.map((thread) => [thread.id, thread.name]))
  const selectedThreadNames =
    selectedNode?.thread_ids.map((threadId) => threadNamesById.get(threadId)).filter((name): name is string => !!name) ?? []

  return (
    <aside className="loom-weaver-panel" aria-label="Weaver's panel">
      <section className="loom-weaver-section">
        <div className="loom-weaver-section-heading">
          <h2 className="loom-weaver-section-title">Selection</h2>
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
                <dt>Session</dt>
                <dd>{selectedNode.session_tag || 'No session tag yet'}</dd>
              </div>
              <div>
                <dt>Threads</dt>
                <dd>{selectedThreadNames.length > 0 ? selectedThreadNames.join(', ') : 'Unthreaded'}</dd>
              </div>
              <div>
                <dt>Body</dt>
                <dd>{excerpt(selectedNode.body) || 'No notes yet.'}</dd>
              </div>
            </dl>

            <div className="loom-selection-actions">
              {selectedNode.kind !== 'start' && selectedNode.kind !== 'end' && (
                <Button variant="secondary" size="compact" onClick={onEdit}>
                  Edit
                </Button>
              )}
              {selectedNode.kind === 'beat' && selectedNode.thread_ids.length > 0 && (
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
              {selectedNode.kind === 'beat' && selectedNode.thread_ids.length === 0 && (
                <Button variant="secondary" size="compact" onClick={() => onRestoreNode(selectedNode)} disabled={focusedThreadId == null}>
                  Restore Beat
                </Button>
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
        ) : (
          <LoomLegend />
        )}
      </section>

      <section className="loom-weaver-section loom-weaver-threads">
        <div className="loom-weaver-section-heading">
          <h2 className="loom-weaver-section-title">Threads</h2>
          <div className="loom-weaver-section-actions">
            {focusedThreadId != null && (
              <Button variant="secondary" size="compact" onClick={onClearThreadFocus}>
                Clear focus
              </Button>
            )}
            <Button variant="secondary" size="compact" onClick={onOpenThreadManager}>
              Manage
            </Button>
          </div>
        </div>
        {threads.length > 0 ? (
          <ul className="loom-weaver-thread-list">
            {threads.map((thread) => (
              <li key={thread.id} className="loom-weaver-thread-row">
                <button
                  type="button"
                  className="loom-weaver-thread-button"
                  aria-pressed={focusedThreadId === thread.id}
                  onClick={() => onFocusThread(thread.id)}
                >
                  <span className="loom-weaver-thread-swatch" data-color={thread.color} aria-hidden="true" />
                  <span className="loom-weaver-thread-name">{thread.name}</span>
                  <span className="loom-weaver-thread-count">
                    {threadCounts[thread.id] ?? 0} {(threadCounts[thread.id] ?? 0) === 1 ? 'node' : 'nodes'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="loom-weaver-copy">No threads yet.</p>
        )}
        {focusedThreadId != null && (
          <p className="loom-weaver-copy">
            Focus keeps this thread bright on the tapestry and dims every unrelated node.
          </p>
        )}
      </section>

      <section className="loom-weaver-section loom-weaver-vault">
        <div className="loom-weaver-section-heading">
          <h2 className="loom-weaver-section-title">Beat Bank</h2>
        </div>
        <LoomVaultPanel
          nodes={bankedNodes}
          onSelectNode={onSelectBankedNode}
          onRestoreNode={onRestoreNode}
          canRestore={focusedThreadId != null}
        />
      </section>
    </aside>
  )
}
