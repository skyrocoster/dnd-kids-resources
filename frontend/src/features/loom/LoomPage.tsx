import { useCallback, useEffect, useMemo, useState } from 'react'
import './LoomCanvas.css'
import './LoomEditor.css'
import { useLoomTapestry } from './useLoomTapestry'
import { bankedBeats, threadOrdered } from './loomGraph'
import { beatReorderTarget } from './beatReorder'
import { LoomSwimlanes } from './LoomSwimlanes'
import { LoomRail } from './LoomRail'
import { LoomNodeEditor } from './LoomNodeEditor'
import { LoomThreadManager } from './LoomThreadManager'
import { LoomBeatReorderDialog } from './LoomBeatReorderDialog'
import { LoomErrorBanner } from './LoomErrorBanner'
import { LoomSessionLogDialog } from './LoomSessionLogDialog'
import { StatePanel } from '../../components/StatePanel'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PageHeader } from '../../components/PageHeader'
import { IconButton } from '../../components/IconButton'
import { MapPinIcon, PlusIcon, WaypointsIcon, FocusIcon } from '../../components/icons'
import { scrollToFellDivider, getFellDividerElement, getLoomGridElement } from './currentPositionScroll'
import {
  bankLoomNode,
  createLoomThread,
  deleteLoomNode,
  fulfilLoomNode,
  insertLoomThreadItem,
  moveLoomThreadItem,
  reorderLoomThreadItem,
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
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null)
  const [reorderThreadId, setReorderThreadId] = useState<number | null>(null)
  const [nodeEditor, setNodeEditor] = useState<{
    node?: LoomNodeType
    initialKind?: LoomNodeKind
    insertThreadId?: number
    insertPosition?: number
  } | null>(null)
  const [threadManagerOpen, setThreadManagerOpen] = useState(false)
  const [pendingDeleteNode, setPendingDeleteNode] = useState<LoomNodeType | null>(null)
  const [deletingNode, setDeletingNode] = useState(false)
  const [bannerError, setBannerError] = useState<string | null>(null)
  const [sessionLogOpen, setSessionLogOpen] = useState(false)
  const [dividerVisible, setDividerVisible] = useState(true)
  const [placingNodeId, setPlacingNodeId] = useState<number | null>(null)

  useEffect(() => {
    if (placingNodeId == null) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPlacingNodeId(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [placingNodeId])

  const banked = useMemo(() => (tapestry.status === 'success' ? bankedBeats(tapestry.data) : []), [tapestry])
  const threads = useMemo(() => (tapestry.status === 'success' ? tapestry.data.threads : []), [tapestry])

  const selectedNode =
    selectedNodeId != null && tapestry.status === 'success'
      ? tapestry.data.nodes.find((n) => n.id === selectedNodeId) ?? null
      : null

  const handleNodeClick = useCallback((nodeId: number) => {
    setSelectedNodeId((prev) => prev === nodeId ? prev : nodeId)
    setSelectedThreadId(null)
  }, [])

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
    setSelectedThreadId(null)
  }, [])

  const handleSelectThread = useCallback((threadId: number) => {
    setSelectedThreadId(threadId)
    setSelectedNodeId(null)
  }, [])

  const handleEditThread = useCallback((_threadId: number) => {
    setThreadManagerOpen(true)
  }, [])

  const handleSelectVaultNode = (node: LoomNodeType) => {
    setSelectedNodeId(node.id)
  }

  const handleNodeSaved = async (savedNode?: LoomNodeType) => {
    const editor = nodeEditor
    setNodeEditor(null)
    if (editor?.insertThreadId != null && editor.insertPosition != null && savedNode) {
      try {
        await insertLoomThreadItem(editor.insertThreadId, {
          node_id: savedNode.id,
          position: editor.insertPosition,
        })
      } catch (err) {
        setBannerError(errorMessage(err, 'Failed to insert node into thread.'))
      }
    }
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
  const handleCardEditNode = useCallback((node: LoomNodeType) => setNodeEditor({ node }), [])
  const handleCardDeleteNode = useCallback((node: LoomNodeType) => setPendingDeleteNode(node), [])
  const handleBankNodeById = (nodeId: number) => {
    if (tapestry.status !== 'success') return
    const node = tapestry.data.nodes.find((n) => n.id === nodeId)
    if (!node) return
    handleBankNode(node)
  }

  const handleRestoreNode = (node: LoomNodeType, threadId: number) => {
    if (tapestry.status !== 'success') return
    const thread = tapestry.data.threads.find((t) => t.id === threadId)
    if (!thread) return
    const ordered = threadOrdered(thread, tapestry.data.nodes)
    const bodyNodes = ordered.filter((n) => n.kind !== 'start' && n.kind !== 'end')
    const position = bodyNodes.length > 0
      ? Math.max(...bodyNodes.map((n) => n.position)) + 10
      : 10
    void runLifecycleCommand(
      () => insertLoomThreadItem(threadId, { node_id: node.id, position }),
      'Failed to restore the beat.',
    )
  }

  const handleGapClick = useCallback((threadId: number, position: number) => {
    setNodeEditor({ initialKind: 'beat', insertThreadId: threadId, insertPosition: position })
  }, [])

  const handleGapRestore = useCallback(
    (nodeId: number, threadId: number, position: number) => {
      setPlacingNodeId(null)
      void runLifecycleCommand(
        () => insertLoomThreadItem(threadId, { node_id: nodeId, position }),
        'Failed to restore the beat.',
      )
    },
    [],
  )

  const handleActivateBankedNode = useCallback((node: LoomNodeType) => {
    setPlacingNodeId(node.id)
    setSelectedNodeId(node.id)
    setSelectedThreadId(null)
  }, [])

  const handleReorder = useCallback(
    (threadId: number, _nodeId: number, fromBodyIndex: number, toBodyIndex: number) => {
      if (tapestry.status !== 'success') return
      const thread = tapestry.data.threads.find((item) => item.id === threadId)
      if (!thread) return
      const allNodes = tapestry.data.nodes
      const ordered = threadOrdered(thread, allNodes)
      const bodyNodes = ordered.filter((n) => n.kind !== 'start' && n.kind !== 'end')
      const beats = bodyNodes.filter((n) => n.kind === 'beat')
      const beatItems = beats.map((n) => ({
        nodeId: n.id,
        position: n.position,
      }))
      const fromBeatIndex = bodyNodes.slice(0, fromBodyIndex).filter((n) => n.kind === 'beat').length
      const rawToBeatIndex = bodyNodes.slice(0, toBodyIndex).filter((n) => n.kind === 'beat').length
      const toBeatIndex = rawToBeatIndex > fromBeatIndex ? rawToBeatIndex - 1 : rawToBeatIndex
      const target = beatReorderTarget(beatItems, fromBeatIndex, toBeatIndex)
      if (!target) return
      void runLifecycleCommand(
        () => reorderLoomThreadItem(threadId, target.nodeId, { position: target.position }),
        'Failed to reorder the beat.',
      )
    },
    [tapestry],
  )

  const handleCrossLaneDrop = useCallback(
    (nodeId: number, sourceThreadId: number, targetThreadId: number, position: number, _nodeKind: 'beat' | 'session') => {
      if (tapestry.status !== 'success') return
      const node = tapestry.data.nodes.find((n) => n.id === nodeId)
      if (!node) return
      void runLifecycleCommand(
        () => moveLoomThreadItem(sourceThreadId, nodeId, { target_thread_id: targetThreadId, position }),
        'Failed to move the node.',
      )
    },
    [tapestry],
  )

  const handleReplaceNode = (node: LoomNodeType) => {
    if (node.thread_id == null) return
    void runLifecycleCommand(async () => {
      await bankLoomNode(node.id)
      setSelectedNodeId(null)
      setNodeEditor({ initialKind: 'beat', insertPosition: node.position })
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

  const handleJumpToCurrent = () => {
    const grid = getLoomGridElement()
    const divider = getFellDividerElement()
    if (grid && divider) {
      scrollToFellDivider(grid, divider)
    }
  }

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
      <Button variant="primary" onClick={() => setSessionLogOpen(true)}>
        <PlusIcon aria-hidden="true" size={16} />
        <span>Advance Campaign</span>
      </Button>
      <Button
        variant="secondary"
        onClick={() => setNodeEditor({ initialKind: 'beat' })}
      >
        <MapPinIcon aria-hidden="true" size={16} />
        <span>Add Beat</span>
      </Button>
      <Button variant="secondary" onClick={() => setThreadManagerOpen(true)}>
        <WaypointsIcon aria-hidden="true" size={16} />
        <span>Manage Threads</span>
      </Button>
      {!dividerVisible && (
        <IconButton
          label="Jump to current"
          onClick={handleJumpToCurrent}
        >
          <FocusIcon size={24} aria-hidden="true" />
        </IconButton>
      )}
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
    <div className="loom-route">
      {pageHeader}
      <div className="loom-page" onClick={handlePaneClick}>
        <div className="loom-canvas-column">
          {bannerError && <LoomErrorBanner message={bannerError} onDismiss={() => setBannerError(null)} />}
          <LoomSwimlanes
            threads={threads}
            nodes={tapestry.status === 'success' ? tapestry.data.nodes : []}
            sessions={tapestry.data.sessions}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleNodeClick}
            selectedThreadId={selectedThreadId}
            onSelectThread={handleSelectThread}
            onGapClick={handleGapClick}
            onReorder={handleReorder}
            onCrossLaneDrop={handleCrossLaneDrop}
            onGapRestore={handleGapRestore}
            onCardEdit={handleCardEditNode}
            onCardBank={handleBankNode}
            onCardDelete={handleCardDeleteNode}
            onDividerVisibilityChange={setDividerVisible}
            placingNodeId={placingNodeId}
          />
        </div>
        <LoomRail
          selectedNode={selectedNode}
          threads={threads}
          selectedThreadId={selectedThreadId}
          onSelectThread={handleSelectThread}
          onEditThread={handleEditThread}
          onEdit={() => {
            if (!selectedNode) return
            setNodeEditor({ node: selectedNode })
          }}
          onDeleteNode={() => {
            if (!selectedNode) return
            setPendingDeleteNode(selectedNode)
          }}
          onFulfilNode={handleFulfilNode}
          onBankNode={handleBankNode}
          onBankNodeById={handleBankNodeById}
          onReplaceNode={handleReplaceNode}
          onSpawnThread={handleSpawnThread}
          onChangeEnding={(node) => setNodeEditor({ node })}
          onUndoFulfil={handleUndoFulfil}
          nodes={banked}
          onSelectNode={handleSelectVaultNode}
          onRestoreNode={handleRestoreNode}
          onActivateNode={handleActivateBankedNode}
          onManageThreads={() => setThreadManagerOpen(true)}
        />
      </div>

      {nodeEditor && (
        <LoomNodeEditor
          node={nodeEditor.node}
          initialKind={nodeEditor.initialKind}
          onClose={() => setNodeEditor(null)}
          onSaved={handleNodeSaved}
        />
      )}

      {threadManagerOpen && (
        <LoomThreadManager threads={threads} onClose={() => setThreadManagerOpen(false)} onChanged={reload} />
      )}

      {sessionLogOpen && tapestry.status === 'success' && (
        <LoomSessionLogDialog
          tapestry={tapestry.data}
          onClose={() => setSessionLogOpen(false)}
          onLogged={() => { setSessionLogOpen(false); reload() }}
          onError={(msg) => setBannerError(msg)}
        />
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
    </div>
  )
}
