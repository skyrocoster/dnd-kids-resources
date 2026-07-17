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
import { LoomVaultPanel } from './LoomVaultPanel'
import { LoomNodeEditor } from './LoomNodeEditor'
import { LoomThreadManager } from './LoomThreadManager'
import { LoomBridgeDialog } from './LoomBridgeDialog'
import { LoomErrorBanner } from './LoomErrorBanner'
import { StatePanel } from '../../components/StatePanel'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { deleteLoomNode, updateLoomNode } from '../../api/client'
import type { LoomAnchorStatus, LoomNode as LoomNodeType, LoomNodeKind, LoomThread } from '../../api/types'

const nodeTypes = { anchor: AnchorNode, update: UpdateNode }

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

  if (tapestry.status === 'loading' || tapestry.status === 'idle') {
    return <StatePanel status="loading" title="Loading the tapestry" message="Fetching threads and nodes…" />
  }

  if (tapestry.status === 'error') {
    return (
      <StatePanel
        status="error"
        message={tapestry.error}
        action={
          <button type="button" className="btn" onClick={reload}>
            Retry
          </button>
        }
      />
    )
  }

  if (tapestry.data.nodes.length === 0 && tapestry.data.threads.length === 0) {
    return (
      <>
        <StatePanel
          status="empty"
          title="Your tapestry is empty"
          message="Create your first thread to start weaving the story."
          action={<Button onClick={() => setThreadManagerOpen(true)}>Create your first thread</Button>}
        />
        {threadManagerOpen && (
          <LoomThreadManager threads={[]} onClose={() => setThreadManagerOpen(false)} onChanged={reload} />
        )}
      </>
    )
  }

  return (
    <LoomThreadsContext.Provider value={threads}>
      <div className="loom-page">
        <div className="loom-canvas-column">
          <div className="loom-toolbar">
            <Button
              variant="secondary"
              onClick={() => setNodeEditor({ initialKind: 'update', position: defaultNewPosition() })}
            >
              New Update
            </Button>
            <Button
              variant="secondary"
              onClick={() => setNodeEditor({ initialKind: 'anchor', position: defaultNewPosition() })}
            >
              New Anchor
            </Button>
            <Button variant="secondary" onClick={() => setThreadManagerOpen(true)}>
              Manage Threads
            </Button>
          </div>
          {bannerError && <LoomErrorBanner message={bannerError} onDismiss={dismissError} />}
          {bridgeSource && (
            <div className="loom-inspector">
              <span className="loom-inspector-title">
                Bridging from "{bridgeSource.title}" — click a planned anchor to connect to
              </span>
              <div className="loom-inspector-actions">
                <Button variant="secondary" size="compact" onClick={() => setBridgeSource(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {selectedNode && (
            <div className="loom-inspector">
              <span className="loom-inspector-title">{selectedNode.title}</span>
              <div className="loom-inspector-actions">
                {canBridgeFromSelected && (
                  <Button
                    variant="secondary"
                    size="compact"
                    onClick={() => {
                      setBridgeSource(selectedNode)
                      setSelectedNodeId(null)
                    }}
                  >
                    Bridge to Anchor…
                  </Button>
                )}
                {selectedNode.kind === 'anchor' && selectedNode.status === 'planned' && (
                  <>
                    <Button
                      variant="secondary"
                      size="compact"
                      onClick={() => setPendingStatusChange({ node: selectedNode, status: 'reached' })}
                    >
                      Mark Reached
                    </Button>
                    <Button
                      variant="secondary"
                      size="compact"
                      onClick={() => setPendingStatusChange({ node: selectedNode, status: 'abandoned' })}
                    >
                      Mark Abandoned
                    </Button>
                  </>
                )}
                <Button variant="secondary" size="compact" onClick={() => setNodeEditor({ node: selectedNode, position: { x: selectedNode.x, y: selectedNode.y } })}>
                  Edit
                </Button>
                <Button variant="danger" size="compact" onClick={() => setPendingDeleteNode(selectedNode)}>
                  Delete
                </Button>
              </div>
            </div>
          )}
          {selectedEdge && (
            <div className="loom-inspector">
              <span className="loom-inspector-title">Edge selected</span>
              <div className="loom-inspector-actions">
                <Button variant="danger" size="compact" onClick={handleDeleteEdge} loading={deletingEdge}>
                  Delete Edge
                </Button>
              </div>
            </div>
          )}
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
        <LoomVaultPanel nodes={vault} onSelectNode={handleSelectVaultNode} />
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
