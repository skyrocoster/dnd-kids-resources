import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  type ReactFlowInstance,
  type Node,
  type NodeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './LoomCanvas.css'
import './LoomEditor.css'
import { useLoomTapestry } from './useLoomTapestry'
import { useLoomCanvasMutations } from './useLoomCanvasMutations'
import { buildFlowEdges, buildFlowNodes, type FlowNodeData } from './loomFlow'
import { bankedBeats } from './loomGraph'
import { LoomThreadsContext } from './nodes/loomThreadsContext'
import { StartNode } from './nodes/StartNode'
import { EndNode } from './nodes/EndNode'
import { BeatNode } from './nodes/BeatNode'
import { SessionNode } from './nodes/SessionNode'
import { LoomWeaverPanel } from './LoomWeaverPanel'
import { LoomNodeEditor } from './LoomNodeEditor'
import { LoomThreadManager } from './LoomThreadManager'
import { LoomErrorBanner } from './LoomErrorBanner'
import { StatePanel } from '../../components/StatePanel'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PageHeader } from '../../components/PageHeader'
import { MapPinIcon, PlusIcon, WaypointsIcon } from '../../components/icons'
import { deleteLoomNode, insertLoomThreadItem } from '../../api/client'
import type { LoomNode as LoomNodeType, LoomNodeKind } from '../../api/types'

const nodeTypes = { start: StartNode, end: EndNode, beat: BeatNode, session: SessionNode }
const LOOM_EYEBROW = 'TAPESTRY · CONTINUITY'
const LOOM_SUBTITLE = 'Track where every story thread stands between sessions.'

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

export function LoomPage() {
  const { tapestry, reload } = useLoomTapestry()
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<Node<FlowNodeData>> | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [focusedThreadId, setFocusedThreadId] = useState<number | null>(null)
  const [nodeEditor, setNodeEditor] = useState<{
    node?: LoomNodeType
    initialKind?: LoomNodeKind
    position: { x: number; y: number }
  } | null>(null)
  const [threadManagerOpen, setThreadManagerOpen] = useState(false)
  const [pendingDeleteNode, setPendingDeleteNode] = useState<LoomNodeType | null>(null)
  const [deletingNode, setDeletingNode] = useState(false)
  const {
    error: bannerError,
    dismissError,
    reportError,
    moveNode,
  } = useLoomCanvasMutations(tapestry, reload)

  const flowNodes = useMemo(() => (tapestry.status === 'success' ? buildFlowNodes(tapestry.data) : []), [tapestry])
  const flowEdges = useMemo(() => (tapestry.status === 'success' ? tapestry.data.threads.flatMap((thread) => buildFlowEdges(flowNodes, thread)) : []), [tapestry, flowNodes])
  const banked = useMemo(() => (tapestry.status === 'success' ? bankedBeats(tapestry.data) : []), [tapestry])
  const threads = useMemo(() => (tapestry.status === 'success' ? tapestry.data.threads : []), [tapestry])
  const threadCounts = useMemo<Record<number, number>>(() => {
    if (tapestry.status !== 'success') return {}

    return tapestry.data.nodes.reduce<Record<number, number>>((counts, node) => {
      for (const threadId of node.thread_ids) counts[threadId] = (counts[threadId] ?? 0) + 1
      return counts
    }, {})
  }, [tapestry])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([])

  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]))
      return flowNodes.map((fn) => {
        const existing = prevById.get(fn.id)
        const isDimmed = focusedThreadId != null && !fn.data.node.thread_ids.includes(focusedThreadId)
        return existing
          ? {
              ...existing,
              data: fn.data,
              selected: fn.id === selectedNodeId,
              className: isDimmed ? 'loom-node-wrapper--dimmed' : undefined,
            }
          : {
              ...fn,
              selected: fn.id === selectedNodeId,
              className: isDimmed ? 'loom-node-wrapper--dimmed' : undefined,
            }
      })
    })
  }, [flowNodes, focusedThreadId, selectedNodeId, setNodes])

  const selectedNode =
    selectedNodeId != null && tapestry.status === 'success'
      ? tapestry.data.nodes.find((n) => String(n.id) === selectedNodeId) ?? null
      : null

  const defaultNewPosition = useCallback((): { x: number; y: number } => {
    if (rfInstance && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      return rfInstance.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    }
    return { x: 0, y: 0 }
  }, [rfInstance])

  const handleSelectVaultNode = (node: LoomNodeType) => {
    setSelectedNodeId(String(node.id))
    if (!rfInstance) return
    rfInstance.setCenter(node.x, node.y, { zoom: 1, duration: 400 })
  }

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setSelectedNodeId(node.id)
    },
    [],
  )

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => moveNode(node.id, node.position.x, node.position.y),
    [moveNode],
  )

  const handleNodeSaved = async (saved: LoomNodeType) => {
    setNodeEditor(null)
    if (!nodeEditor?.node && focusedThreadId != null) {
      try {
        await insertLoomThreadItem(focusedThreadId, { node_id: saved.id, position: 10 })
      } catch (err) {
        reportError(errorMessage(err, 'Node created, but could not place it in the thread.'))
      }
    }
    reload()
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
      reportError(errorMessage(err, 'Failed to delete the node.'))
    } finally {
      setDeletingNode(false)
    }
  }

  const commandBar = (
    <div className="loom-command-bar">
      <Button variant="primary" onClick={() => setNodeEditor({ initialKind: 'session', position: defaultNewPosition() })}>
        <PlusIcon aria-hidden="true" size={16} />
        <span>Record Session</span>
      </Button>
      <Button
        variant="secondary"
        onClick={() => setNodeEditor({ initialKind: 'beat', position: defaultNewPosition() })}
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
        <div className="loom-page">
          <div className="loom-canvas-column">
            {bannerError && <LoomErrorBanner message={bannerError} onDismiss={dismissError} />}
            <div className="loom-canvas-area" ref={canvasRef}>
              <ReactFlow<Node<FlowNodeData>>
                nodes={nodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                onInit={setRfInstance}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                onNodesChange={onNodesChange}
                onNodeDragStop={handleNodeDragStop}
                fitView
                proOptions={{ hideAttribution: false }}
              >
                <Background gap={24} size={1} color="color-mix(in srgb, var(--md-outline-variant) 68%, transparent)" />
                <Controls />
              </ReactFlow>
            </div>
          </div>
          <LoomWeaverPanel
            selectedNode={selectedNode}
            threads={threads}
            threadCounts={threadCounts}
            bankedNodes={banked}
            focusedThreadId={focusedThreadId}
            onEdit={() => {
              if (!selectedNode) return
              setNodeEditor({ node: selectedNode, position: { x: selectedNode.x, y: selectedNode.y } })
            }}
            onDeleteNode={() => {
              if (!selectedNode) return
              setPendingDeleteNode(selectedNode)
            }}
            onSelectBankedNode={handleSelectVaultNode}
            onOpenThreadManager={() => setThreadManagerOpen(true)}
            onFocusThread={(threadId) => setFocusedThreadId(threadId)}
            onClearThreadFocus={() => setFocusedThreadId(null)}
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
