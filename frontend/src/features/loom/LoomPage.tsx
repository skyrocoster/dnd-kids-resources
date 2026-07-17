import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  type ReactFlowInstance,
  type Edge,
  type Connection,
  type Node,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './LoomCanvas.css'
import './LoomEditor.css'
import { useLoomTapestry } from './useLoomTapestry'
import { useLoomCanvasMutations } from './useLoomCanvasMutations'
import { buildFlowEdges, buildFlowNodes, type FlowNodeData } from './loomFlow'
import { buildNodeStatusUpdate, isFuture, isPast, vaultNodes } from './loomGraph'
import { LoomThreadsContext } from './nodes/loomThreadsContext'
import { AnchorNode } from './nodes/AnchorNode'
import { UpdateNode } from './nodes/UpdateNode'
import { LoomWeaverPanel } from './LoomWeaverPanel'
import { LoomNodeEditor } from './LoomNodeEditor'
import { LoomThreadManager } from './LoomThreadManager'
import { LoomBridgeDialog } from './LoomBridgeDialog'
import { LoomErrorBanner } from './LoomErrorBanner'
import { StatePanel } from '../../components/StatePanel'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PageHeader } from '../../components/PageHeader'
import { MapPinIcon, PlusIcon, WaypointsIcon } from '../../components/icons'
import { deleteLoomNode, updateLoomNode } from '../../api/client'
import type { LoomAnchorStatus, LoomNode as LoomNodeType, LoomNodeKind, LoomThread } from '../../api/types'

const nodeTypes = { anchor: AnchorNode, update: UpdateNode }
const LOOM_EYEBROW = 'TAPESTRY · CONTINUITY'
const LOOM_SUBTITLE = 'Track where every story thread stands between sessions.'

function edgeColor(threadIds: number[], threads: LoomThread[]): string {
  if (threadIds.length === 0) return 'var(--md-outline)'
  const thread = threads.find((t) => t.id === threadIds[0])
  return thread ? `var(--md-loom-${thread.color})` : 'var(--md-outline)'
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

export function LoomPage() {
  const { tapestry, reload } = useLoomTapestry()
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<Node<FlowNodeData>, Edge> | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [nodeEditor, setNodeEditor] = useState<{
    node?: LoomNodeType
    initialKind?: LoomNodeKind
    position: { x: number; y: number }
  } | null>(null)
  const [threadManagerOpen, setThreadManagerOpen] = useState(false)
  const [pendingDeleteNode, setPendingDeleteNode] = useState<LoomNodeType | null>(null)
  const [deletingNode, setDeletingNode] = useState(false)
  const [deletingEdge, setDeletingEdge] = useState(false)
  const [bridgeSource, setBridgeSource] = useState<LoomNodeType | null>(null)
  const [bridgeTarget, setBridgeTarget] = useState<LoomNodeType | null>(null)
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    node: LoomNodeType
    status: LoomAnchorStatus
  } | null>(null)
  const [savingStatus, setSavingStatus] = useState(false)
  const {
    error: bannerError,
    dismissError,
    reportError,
    isValidConnection: canConnect,
    connect,
    moveNode,
    removeEdge,
  } = useLoomCanvasMutations(tapestry, reload)

  const flowNodes = useMemo(() => (tapestry.status === 'success' ? buildFlowNodes(tapestry.data) : []), [tapestry])
  const flowEdges = useMemo(() => (tapestry.status === 'success' ? buildFlowEdges(tapestry.data) : []), [tapestry])
  const vault = useMemo(() => (tapestry.status === 'success' ? vaultNodes(tapestry.data) : []), [tapestry])
  const threads = useMemo(() => (tapestry.status === 'success' ? tapestry.data.threads : []), [tapestry])

  // React Flow owns node state so it can attach its own internals (measured
  // dimensions, `dragging`) via `onNodesChange`. Rebuilding the array from
  // `buildFlowNodes` on every render (the previous approach) stripped those
  // fields mid-drag and forced a re-measure, which flashed/reflowed the canvas.
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([])

  // Reconcile server-derived data into the React-Flow-owned nodes whenever the
  // tapestry or selection changes, preserving each existing node's live
  // position and RF internals (new nodes take their fresh server position).
  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]))
      return flowNodes.map((fn) => {
        const existing = prevById.get(fn.id)
        return existing
          ? { ...existing, data: fn.data, selected: fn.id === selectedNodeId }
          : { ...fn, selected: fn.id === selectedNodeId }
      })
    })
  }, [flowNodes, selectedNodeId, setNodes])

  const edges: Edge[] = useMemo(
    () =>
      flowEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        selected: edge.id === selectedEdgeId,
        style: { stroke: edgeColor(edge.data.threadIds, threads) },
      })),
    [flowEdges, threads, selectedEdgeId],
  )

  const selectedNode =
    selectedNodeId != null && tapestry.status === 'success'
      ? tapestry.data.nodes.find((n) => String(n.id) === selectedNodeId) ?? null
      : null
  const selectedEdge =
    selectedEdgeId != null && tapestry.status === 'success'
      ? tapestry.data.edges.find((e) => String(e.id) === selectedEdgeId) ?? null
      : null
  const selectedFlowNode = selectedNodeId != null ? flowNodes.find((n) => n.id === selectedNodeId) : undefined
  const canBridgeFromSelected = !!selectedNode && isPast(selectedNode) && !!selectedFlowNode?.data.isHead

  const defaultNewPosition = useCallback((): { x: number; y: number } => {
    if (rfInstance && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      return rfInstance.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    }
    return { x: 0, y: 0 }
  }, [rfInstance])

  const handleSelectVaultNode = (node: LoomNodeType) => {
    setSelectedNodeId(String(node.id))
    setSelectedEdgeId(null)
    setBridgeSource(null)
    if (!rfInstance) return
    rfInstance.setCenter(node.x, node.y, { zoom: 1, duration: 400 })
  }

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (bridgeSource) {
        const target = tapestry.status === 'success' ? tapestry.data.nodes.find((n) => String(n.id) === node.id) : undefined
        if (target && isFuture(target)) {
          setBridgeTarget(target)
        } else {
          reportError('Select a planned anchor node to complete the bridge.')
        }
        return
      }
      setSelectedNodeId(node.id)
      setSelectedEdgeId(null)
    },
    [bridgeSource, tapestry, reportError],
  )

  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      if (bridgeSource) return
      setSelectedEdgeId(edge.id)
      setSelectedNodeId(null)
    },
    [bridgeSource],
  )

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setBridgeSource(null)
  }, [])

  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => moveNode(node.id, node.position.x, node.position.y),
    [moveNode],
  )

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const source = 'source' in connection ? connection.source : undefined
      const target = 'target' in connection ? connection.target : undefined
      return canConnect(source, target)
    },
    [canConnect],
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      connect(connection.source, connection.target)
    },
    [connect],
  )

  const handleDeleteEdge = () => {
    if (!selectedEdge) return
    setDeletingEdge(true)
    removeEdge(String(selectedEdge.id))
      .then(() => setSelectedEdgeId(null))
      .catch(() => {})
      .finally(() => setDeletingEdge(false))
  }

  const handleNodeSaved = () => {
    setNodeEditor(null)
    reload()
  }

  const handleConfirmStatusChange = async () => {
    if (!pendingStatusChange) return
    const { node, status } = pendingStatusChange
    setSavingStatus(true)
    try {
      await updateLoomNode(node.id, buildNodeStatusUpdate(node, status))
      setPendingStatusChange(null)
      setSelectedNodeId(null)
      reload()
    } catch (err) {
      reportError(errorMessage(err, 'Failed to update the anchor status.'))
    } finally {
      setSavingStatus(false)
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
      reportError(errorMessage(err, 'Failed to delete the node.'))
    } finally {
      setDeletingNode(false)
    }
  }

  const commandBar = (
    <div className="loom-command-bar">
      <Button variant="primary" onClick={() => setNodeEditor({ initialKind: 'update', position: defaultNewPosition() })}>
        <PlusIcon aria-hidden="true" size={16} />
        <span>New Update</span>
      </Button>
      <Button
        variant="secondary"
        onClick={() => setNodeEditor({ initialKind: 'anchor', position: defaultNewPosition() })}
      >
        <MapPinIcon aria-hidden="true" size={16} />
        <span>New Anchor</span>
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
              <ReactFlow<Node<FlowNodeData>, Edge>
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onInit={setRfInstance}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                onPaneClick={handlePaneClick}
                onNodesChange={onNodesChange}
                onNodeDragStop={handleNodeDragStop}
                onConnect={handleConnect}
                isValidConnection={isValidConnection}
                fitView
                proOptions={{ hideAttribution: false }}
              >
                <Background />
                <Controls />
              </ReactFlow>
            </div>
          </div>
          <LoomWeaverPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            threads={threads}
            vaultNodes={vault}
            canBridgeFromSelected={canBridgeFromSelected}
            bridgeSource={bridgeSource}
            deletingEdge={deletingEdge}
            onBridge={() => {
              if (!selectedNode) return
              setBridgeSource(selectedNode)
              setSelectedNodeId(null)
            }}
            onMarkReached={() => {
              if (!selectedNode) return
              setPendingStatusChange({ node: selectedNode, status: 'reached' })
            }}
            onMarkAbandoned={() => {
              if (!selectedNode) return
              setPendingStatusChange({ node: selectedNode, status: 'abandoned' })
            }}
            onEdit={() => {
              if (!selectedNode) return
              setNodeEditor({ node: selectedNode, position: { x: selectedNode.x, y: selectedNode.y } })
            }}
            onDeleteNode={() => {
              if (!selectedNode) return
              setPendingDeleteNode(selectedNode)
            }}
            onDeleteEdge={handleDeleteEdge}
            onSelectVaultNode={handleSelectVaultNode}
            onOpenThreadManager={() => setThreadManagerOpen(true)}
            onCancelBridge={() => setBridgeSource(null)}
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

      {bridgeSource && bridgeTarget && (
        <LoomBridgeDialog
          source={bridgeSource}
          anchor={bridgeTarget}
          onClose={() => setBridgeTarget(null)}
          onBridged={() => {
            setBridgeSource(null)
            setBridgeTarget(null)
            reload()
          }}
        />
      )}

      {pendingStatusChange && (
        <ConfirmDialog
          message={`Mark "${pendingStatusChange.node.title}" as ${pendingStatusChange.status}?`}
          confirmLabel={pendingStatusChange.status === 'reached' ? 'Mark Reached' : 'Mark Abandoned'}
          onConfirm={handleConfirmStatusChange}
          onCancel={() => setPendingStatusChange(null)}
          pending={savingStatus}
        />
      )}
    </LoomThreadsContext.Provider>
  )
}
