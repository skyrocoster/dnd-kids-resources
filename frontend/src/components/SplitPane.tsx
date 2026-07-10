import { useCallback, useId, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'
import './SplitPane.css'

interface SplitPaneProps {
  left: ReactNode
  right: ReactNode
  defaultLeftWidth?: number
  minLeftWidth?: number
  maxLeftWidth?: number
  leftLabel?: string
}

const STEP = 16

export function SplitPane({
  left,
  right,
  defaultLeftWidth = 280,
  minLeftWidth = 180,
  maxLeftWidth = 520,
  leftLabel = 'panel',
}: SplitPaneProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const separatorId = useId()

  const clamp = useCallback(
    (value: number) => Math.min(maxLeftWidth, Math.max(minLeftWidth, value)),
    [maxLeftWidth, minLeftWidth],
  )

  const handlePointerMove = useCallback(
    (event: globalThis.PointerEvent) => {
      if (!draggingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setLeftWidth(clamp(event.clientX - rect.left))
    },
    [clamp],
  )

  const stopDragging = useCallback(() => {
    draggingRef.current = false
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopDragging)
  }, [handlePointerMove])

  const startDragging = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    draggingRef.current = true
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDragging)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setLeftWidth((w) => clamp(w - STEP))
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      setLeftWidth((w) => clamp(w + STEP))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setLeftWidth(minLeftWidth)
    } else if (event.key === 'End') {
      event.preventDefault()
      setLeftWidth(maxLeftWidth)
    }
  }

  return (
    <div className="split-pane" ref={containerRef}>
      <div className="split-pane-left" style={{ width: leftWidth }} id={separatorId}>
        {left}
      </div>
      <div
        className="split-pane-handle"
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${leftLabel}`}
        aria-controls={separatorId}
        aria-valuenow={leftWidth}
        aria-valuemin={minLeftWidth}
        aria-valuemax={maxLeftWidth}
        tabIndex={0}
        onPointerDown={startDragging}
        onKeyDown={handleKeyDown}
      />
      <div className="split-pane-right">{right}</div>
    </div>
  )
}
