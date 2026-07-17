import { useMemo, useState } from 'react'
import { ReactFlow, Background, Controls, type ReactFlowInstance, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './LoomCanvas.css'
import { useLoomTapestry } from './useLoomTapestry'
import { buildFlowEdges, buildFlowNodes } from './loomFlow'
import { vaultNodes } from './loomGraph'
import { LoomThreadsContext } from './nodes/loomThreadsContext'
import { AnchorNode } from './nodes/AnchorNode'
import { UpdateNode } from './nodes/UpdateNode'
import { LoomVaultPanel } from './LoomVaultPanel'
import { StatePanel } from '../../components/StatePanel'
import type { LoomNode } from '../../api/types'

const nodeTypes = { anchor: AnchorNode, update: UpdateNode }

function edgeColor(threadIds: number[], threads: { id: number; color: string }[]): string {
  if (threadIds.length === 0) return 'var(--md-outline)'
  const thread = threads.find((t) => t.id === threadIds[0])
  return thread ? `var(--md-${thread.color})` : 'var(--md-outline)'
}

export function LoomPage() {
  const { tapestry, reload } = useLoomTapestry()
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)

  const flowNodes = useMemo(() => (tapestry.status === 'success' ? buildFlowNodes(tapestry.data) : []), [tapestry])
  const flowEdges = useMemo(() => (tapestry.status === 'success' ? buildFlowEdges(tapestry.data) : []), [tapestry])
  const vault = useMemo(() => (tapestry.status === 'success' ? vaultNodes(tapestry.data) : []), [tapestry])
  const threads = useMemo(() => (tapestry.status === 'success' ? tapestry.data.threads : []), [tapestry])

  const edges: Edge[] = useMemo(
    () =>
      flowEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        style: { stroke: edgeColor(edge.data.threadIds, threads) },
      })),
    [flowEdges, threads],
  )

  const handleSelectVaultNode = (node: LoomNode) => {
    if (!rfInstance) return
    rfInstance.setCenter(node.x, node.y, { zoom: 1, duration: 400 })
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

  return (
    <LoomThreadsContext.Provider value={threads}>
      <div className="loom-page">
        <div className="loom-canvas-area">
          <ReactFlow
            nodes={flowNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={setRfInstance}
            fitView
            proOptions={{ hideAttribution: false }}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        <LoomVaultPanel nodes={vault} onSelectNode={handleSelectVaultNode} />
      </div>
    </LoomThreadsContext.Provider>
  )
}
