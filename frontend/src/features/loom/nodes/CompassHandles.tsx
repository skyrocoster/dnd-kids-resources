import { Handle, Position } from '@xyflow/react'

const COMPASS: Array<{ id: 'top' | 'right' | 'bottom' | 'left'; position: Position }> = [
  { id: 'top', position: Position.Top },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
  { id: 'left', position: Position.Left },
]

/**
 * Every node border exposes a source and a target handle on all four sides, hidden
 * (`loom-handle--anchor` in LoomCanvas.css) — they're anchor points for `loomFlow.ts`'s
 * `compassHandles` to route through, not user-facing connection dots. `nodesConnectable`
 * is false on the canvas, so nothing is manually draggable off them.
 */
export function CompassHandles() {
  return (
    <>
      {COMPASS.map(({ id, position }) => (
        <Handle key={`source-${id}`} className="loom-handle--anchor" type="source" id={id} position={position} />
      ))}
      {COMPASS.map(({ id, position }) => (
        <Handle key={`target-${id}`} className="loom-handle--anchor" type="target" id={id} position={position} />
      ))}
    </>
  )
}
