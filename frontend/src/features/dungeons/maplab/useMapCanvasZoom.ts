import { useState, useCallback } from 'react'
import type { Bounds } from './maplabModel'

export interface ZoomState {
  scale: number
  pan: { x: number; y: number }
}

const MIN_SCALE = 0.25
const MAX_SCALE = 3
const BASE_PX_PER_UNIT = 64

export function useMapCanvasZoom() {
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, pan: { x: 0, y: 0 } })

  const zoomIn = useCallback(() => {
    throw new Error('not implemented')
  }, [])

  const zoomOut = useCallback(() => {
    throw new Error('not implemented')
  }, [])

  const reset = useCallback(() => {
    throw new Error('not implemented')
  }, [])

  const fitToBounds = useCallback((bounds: Bounds) => {
    throw new Error('not implemented')
  }, [])

  const handleWheel = useCallback((e: WheelEvent) => {
    throw new Error('not implemented')
  }, [])

  const handlePointerDown = useCallback((e: PointerEvent) => {
    throw new Error('not implemented')
  }, [])

  return {
    zoom,
    zoomIn,
    zoomOut,
    reset,
    fitToBounds,
    handleWheel,
    handlePointerDown,
    MIN_SCALE,
    MAX_SCALE,
    BASE_PX_PER_UNIT,
  }
}
