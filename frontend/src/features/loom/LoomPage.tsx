import { useCallback, useMemo, useState } from 'react'
import './LoomCanvas.css'
import './LoomEditor.css'
import { useLoomTapestry } from './useLoomTapestry'
import { bankedBeats } from './loomGraph'
import { LoomSwimlanes } from './LoomSwimlanes'
import { LoomThreadsContext } from './nodes/loomThreadsContext'
import { LoomWeaverPanel } from './LoomWeaverPanel'
import { LoomBeatBankTray } from './LoomBeatBankTray'
import { LoomNodeEditor } from './LoomNodeEditor'
import { LoomThreadManager } from './LoomThreadManager'
import { LoomBeatReorderDialog } from './LoomBeatReorderDialog'
import { LoomErrorBanner } from './LoomErrorBanner'
import { StatePanel } from '../../components/StatePanel'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PageHeader } from '../../components/PageHeader'
import { MapPinIcon, PlusIcon, WaypointsIcon } from '../../components/icons'
import {
  bankLoomNode,
  createLoomThread,
  deleteLoomNode,
  fulfilLoomNode,
  insertLoomThreadItem,
  updateLoomNode,
} from '../../api/client'
import type { LoomNode as LoomNodeType, LoomNodeKind } from '../../api/types'

const LOOM_EYEBROW = 'TAPESTRY · CONTINUITY'
const LOOM_SUBTITLE = 'Track where every story thread stands between sessions.'

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

export function LoomPage() {
  const { tapestry, reload } = useLoomTapestry()

  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null)
  const [reorderThreadId, setReorderThreadId] = useState<number | null>(null)
  const [nodeEditor, setNodeEditor] = useState<{
    node?: LoomNodeType
    initialKind?: LoomNodeKind
    position: { x: number; y: number }
    insertPosition?: number
  } | null>(null)
  const [threadManagerOpen, setThreadManagerOpen] = useState(false)
  const [pendingDeleteNode, setPendingDeleteNode] = useState<LoomNodeType | null>(null)
  const [deletingNode, setDeletingNode] = useState(false)
  const [bannerError, setBannerError] = useState<string | null>(null)

  const banked = useMemo(() => (tapestry.status === 'success' ? bankedBeats(tapestry.data) : []), [tapestry])
  const threads = useMemo(() => (tapestry.status === 'success' ? tapestry.data.threads : []), [tapestry])

  const selectedNode =
    selectedNodeId != null && tapestry.status === 'success'
      ? tapestry.data.nodes.find((n) => n.id === selectedNodeId) ?? null
      : null

  const handleNodeClick = useCallback((nodeId: number) => {
    setSelectedNodeId((prev) => prev === nodeId ? prev : nodeId)
  }, [])

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const handleSelectVaultNode = (node: LoomNodeType) => {
    setSelectedNodeId(node.id)
  }

  const handleNodeSaved = () => {
    setNodeEditor(null)
    reload()
  }

  const runLifecycleCommand = async (command: () => Promise<unknown>, fallback: string) => {
    try {
      await command()
      reload()
    } catch (err) {
      setBannerError(errorMessage(err, fallback))
    }
  }

  const handleFulfilNode = (node: LoomNodeType) => void runLifecycleCommand(() => fulfilLoomNode(node.id), 'Failed to fulfil the beat.')
  const handleBankNode = (node: LoomNodeType) => void runLifecycleCommand(() => bankLoomNode(node.id), 'Failed to bank the beat.')

  const handleRestoreNode = (node: LoomNodeType, threadId: number) => {
    void runLifecycleCommand(
      () => insertLoomThreadItem(threadId, { node_id: node.id, position: 10 }),
      'Failed to restore the beat.',
    )
  }

  const handleReplaceNode = (node: LoomNodeType) => {
    if (node.thread_ids.length === 0) return
    const thread = tapestry.status === 'success' ? tapestry.data.threads.find((item) => item.id === node.thread_ids[0]) : undefined
    const position = thread?.items.find((item) => item.node_id === node.id)?.position ?? 10
    void runLifecycleCommand(async () => {
      await bankLoomNode(node.id)
      setSelectedNodeId(null)
      setNodeEditor({ initialKind: 'beat', position: { x: node.x, y: node.y }, insertPosition: position })
    }, 'Failed to replace the beat.')
  }

  const handleSpawnThread = (node: LoomNodeType) =>
    void runLifecycleCommand(
      () => createLoomThread({ name: `${node.title} Thread`, origin_node_id: node.id }),
      'Failed to spawn a thread from the session.',
    )

  const handleUndoFulfil = (node: LoomNodeType) =>
    void runLifecycleCommand(
      () => updateLoomNode(node.id, { kind: 'beat', title: node.fulfilled_planned_title ?? node.title, body: node.body ?? undefined }),
      'Failed to undo fulfilment.',
    )

  const handleConfirmDeleteNode = async () => {
    if (!pendingDeleteNode) return
    setDeletingNode(true)
    try {
      await deleteLoomNode(pendingDeleteNode.id)
      setPendingDeleteNode(null)
      setSelectedNodeId(null)
      reload()
    } catch (err) {
      setBannerError(errorMessage(err, 'Failed to delete the node.'))
    } finally {
      setDeletingNode(false)
    }
  }

  const commandBar = (
    <div className="loom-command-bar">
      <Button variant="primary" onClick={() => setNodeEditor({ initialKind: 'session', position: { x: 0, y: 0 } })}>
        <PlusIcon aria-hidden="true" size={16} />
        <span>Record Session</span>
      </Button>
      <Button
        variant="secondary"
        onClick={() => setNodeEditor({ initialKind: 'beat', position: { x: 0, y: 0 } })}
      >
        <MapPinIcon aria-hidden="true" size={16} />
        <span>Add Beat</span>
      </Button>
      <Button variant="secondary" onClick={() => setThreadManagerOpen(true)}>
        <WaypointsIcon aria-hidden="true" size={16} />
        <span>Manage Threads</span>
      </Button>
    </div>
  )

  const pageHeader = (
    <div className="loom-page-header">
      <p className="loom-eyebrow">{LOOM_EYEBROW}</p>
      <PageHeader title="The Loom" subtitle={LOOM_SUBTITLE} actions={commandBar} />
    </div>
  )

  if (tapestry.status === 'loading' || tapestry.status === 'idle') {
    return (
      <div className="loom-route">
        {pageHeader}
        <StatePanel status="loading" title="Loading the tapestry" message="Fetching threads and nodes…" />
      </div>
    )
  }

  if (tapestry.status === 'error') {
    return (
      <div className="loom-route">
        {pageHeader}
        <StatePanel
          status="error"
          message={tapestry.error}
          action={
            <button type="button" className="btn" onClick={reload}>
              Retry
            </button>
          }
        />
      </div>
    )
  }

  if (tapestry.data.nodes.length === 0 && tapestry.data.threads.length === 0) {
    return (
      <div className="loom-route">
        {pageHeader}
        <StatePanel
          status="empty"
          title="Your tapestry is empty"
          message="Create your first thread to start weaving the story."
          action={<Button onClick={() => setThreadManagerOpen(true)}>Create your first thread</Button>}
        />
        {threadManagerOpen && (
          <LoomThreadManager threads={[]} onClose={() => setThreadManagerOpen(false)} onChanged={reload} />
        )}
      </div>
    )
  }

  return (
    <LoomThreadsContext.Provider value={threads}>
      <div className="loom-route">
        {pageHeader}
        <div className="loom-page" onClick={handlePaneClick}>
          <div className="loom-canvas-column">
            {bannerError && <LoomErrorBanner message={bannerError} onDismiss={() => setBannerError(null)} />}
            <LoomSwimlanes
              threads={threads}
              nodes={tapestry.status === 'success' ? tapestry.data.nodes : []}
              selectedNodeId={selectedNodeId}
              onSelectNode={handleNodeClick}
            />
            <LoomBeatBankTray
              nodes={banked}
              threads={threads}
              onSelectNode={handleSelectVaultNode}
              onRestoreNode={handleRestoreNode}
            />
          </div>
          <LoomWeaverPanel
            selectedNode={selectedNode}
            threads={threads}
            onEdit={() => {
              if (!selectedNode) return
              setNodeEditor({ node: selectedNode, position: { x: selectedNode.x, y: selectedNode.y } })
            }}
            onDeleteNode={() => {
              if (!selectedNode) return
              setPendingDeleteNode(selectedNode)
            }}
            onFulfilNode={handleFulfilNode}
            onBankNode={handleBankNode}
            onReplaceNode={handleReplaceNode}
            onSpawnThread={handleSpawnThread}
            onChangeEnding={(node) => setNodeEditor({ node, position: { x: node.x, y: node.y } })}
            onUndoFulfil={handleUndoFulfil}
          />
        </div>
      </div>

      {nodeEditor && (
        <LoomNodeEditor
          node={nodeEditor.node}
          initialKind={nodeEditor.initialKind}
          threads={threads}
          defaultPosition={nodeEditor.position}
          onClose={() => setNodeEditor(null)}
          onSaved={handleNodeSaved}
        />
      )}

      {threadManagerOpen && (
        <LoomThreadManager threads={threads} onClose={() => setThreadManagerOpen(false)} onChanged={reload} />
      )}

      {reorderThreadId != null && tapestry.status === 'success' && (() => {
        const thread = tapestry.data.threads.find((item) => item.id === reorderThreadId)
        return thread ? (
          <LoomBeatReorderDialog
            thread={thread}
            nodes={tapestry.data.nodes}
            onReordered={reload}
            onError={(msg) => setBannerError(msg)}
            onClose={() => setReorderThreadId(null)}
          />
        ) : null
      })()}

      {pendingDeleteNode && (
        <ConfirmDialog
          message={`Delete "${pendingDeleteNode.title}"? This cannot be undone.`}
          onConfirm={handleConfirmDeleteNode}
          onCancel={() => setPendingDeleteNode(null)}
          pending={deletingNode}
        />
      )}
    </LoomThreadsContext.Provider>
  )
}
