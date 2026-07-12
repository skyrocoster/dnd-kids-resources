import React, { ReactNode } from 'react'
import type { Bounds } from './maplabModel'

interface MapCanvasProps {
  viewBox: string
  bounds: Bounds
  children: ReactNode
  controlsSlot?: ReactNode
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  viewBox,
  bounds,
  children,
  controlsSlot,
}) => {
  return (
    <div className="maplab-canvas-wrapper">
      <div className="maplab-canvas-viewport">
        <svg
          className="maplab-svg"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Map Lab Canvas"
        >
          {children}
        </svg>
      </div>
      {controlsSlot && <div className="maplab-zoom-controls">{controlsSlot}</div>}
    </div>
  )
}
