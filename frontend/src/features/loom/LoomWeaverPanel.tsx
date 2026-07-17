import type { LoomNode, LoomEdge, LoomThread } from '../../api/types'
import { Button } from '../../components/Button'
import { LoomLegend } from './LoomLegend'
import { LoomVaultPanel } from './LoomVaultPanel'

export interface LoomWeaverPanelProps {
  selectedNode: LoomNode | null
  selectedEdge: LoomEdge | null
  threads: LoomThread[]
  vaultNodes: LoomNode[]
  canBridgeFromSelected: boolean
  bridgeSource: LoomNode | null
  deletingEdge?: boolean
  onBridge: () => void
  onMarkReached: () => void
  onMarkAbandoned: () => void
  onEdit: () => void
  onDeleteNode: () => void
  onDeleteEdge: () => void
  onSelectVaultNode: (node: LoomNode) => void
  onOpenThreadManager: () => void
  onCancelBridge: () => void
}

function kindLabel(node: LoomNode): string {
  return node.kind === 'anchor' ? 'Anchor' : 'Update'
}

function statusLabel(node: LoomNode): string {
  if (node.kind === 'update') return 'Recorded'
  if (node.status === 'reached') return 'Reached'
  if (node.status === 'abandoned') return 'Abandoned'
  return 'Planned'
}

function excerpt(body: string | null | undefined): string | null {
  if (!body) return null
  const compact = body.trim().replace(/\s+/g, ' ')
  if (!compact) return null
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact
}

export function LoomWeaverPanel({
  selectedNode,
  selectedEdge,
  threads,
  vaultNodes,
  canBridgeFromSelected,
  bridgeSource,
  deletingEdge = false,
  onBridge,
  onMarkReached,
  onMarkAbandoned,
  onEdit,
  onDeleteNode,
  onDeleteEdge,
  onSelectVaultNode,
  onOpenThreadManager,
  onCancelBridge,
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

        {bridgeSource ? (
          <div className="loom-selection-stack">
            <p className="loom-weaver-copy">
              Bridging from <strong>{bridgeSource.title}</strong>. Click a planned anchor on the canvas to complete the bridge.
            </p>
            <div className="loom-selection-actions">
              <Button variant="secondary" size="compact" onClick={onCancelBridge}>
                Cancel
              </Button>
            </div>
          </div>
        ) : selectedNode ? (
          <div className="loom-selection-stack">
            <div className="loom-selection-header">
              <h3 className="loom-selection-title">{selectedNode.title}</h3>
              <div className="loom-selection-meta" aria-label="Node details">
                <span className="loom-selection-pill" data-tone={selectedNode.kind}>
                  <span className="loom-selection-pill-glyph" aria-hidden="true">
                    {selectedNode.kind === 'anchor' ? '◇' : '■'}
                  </span>
                  {kindLabel(selectedNode)}
                </span>
                <span className="loom-selection-pill" data-tone={selectedNode.kind === 'anchor' ? selectedNode.status ?? 'planned' : 'update'}>
                  <span className="loom-selection-pill-glyph" aria-hidden="true">
                    {selectedNode.kind === 'anchor'
                      ? selectedNode.status === 'reached'
                        ? '◆'
                        : selectedNode.status === 'abandoned'
                          ? '△'
                          : '◇'
                      : '●'}
                  </span>
                  {statusLabel(selectedNode)}
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
              {canBridgeFromSelected && (
                <Button variant="secondary" size="compact" onClick={onBridge}>
                  Bridge to Anchor...
                </Button>
              )}
              {selectedNode.kind === 'anchor' && selectedNode.status === 'planned' && (
                <>
                  <Button variant="secondary" size="compact" onClick={onMarkReached}>
                    Mark Reached
                  </Button>
                  <Button variant="secondary" size="compact" onClick={onMarkAbandoned}>
                    Mark Abandoned
                  </Button>
                </>
              )}
              <Button variant="secondary" size="compact" onClick={onEdit}>
                Edit
              </Button>
              <Button variant="danger" size="compact" onClick={onDeleteNode}>
                Delete
              </Button>
            </div>
          </div>
        ) : selectedEdge ? (
          <div className="loom-selection-stack">
            <p className="loom-selection-title">Edge selected</p>
            <p className="loom-weaver-copy">This connection links two moments in the tapestry.</p>
            <div className="loom-selection-actions">
              <Button variant="danger" size="compact" onClick={onDeleteEdge} loading={deletingEdge}>
                Delete Edge
              </Button>
            </div>
          </div>
        ) : (
          <LoomLegend />
        )}
      </section>

      <section className="loom-weaver-section loom-weaver-threads">
        <div className="loom-weaver-section-heading">
          <h2 className="loom-weaver-section-title">Threads</h2>
          <Button variant="secondary" size="compact" onClick={onOpenThreadManager}>
            Manage
          </Button>
        </div>
        {threads.length > 0 ? (
          <ul className="loom-weaver-thread-list">
            {threads.map((thread) => (
              <li key={thread.id} className="loom-weaver-thread-row">
                <span className="loom-weaver-thread-swatch" data-color={thread.color} aria-hidden="true" />
                <span className="loom-weaver-thread-name">{thread.name}</span>
                <span className="loom-weaver-thread-count">{thread.id === selectedNode?.thread_ids[0] ? 'Selected' : ''}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="loom-weaver-copy">No threads yet.</p>
        )}
      </section>

      <section className="loom-weaver-section loom-weaver-vault">
        <div className="loom-weaver-section-heading">
          <h2 className="loom-weaver-section-title">Idea Vault</h2>
        </div>
        <LoomVaultPanel nodes={vaultNodes} onSelectNode={onSelectVaultNode} />
      </section>
    </aside>
  )
}
