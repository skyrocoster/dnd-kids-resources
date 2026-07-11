import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { CloseIcon, GripIcon } from './icons'
import './FloatingWindow.css'

interface Position {
  x: number
  y: number
}

interface FloatingWindowProps {
  title: string
  storageKey: string
  onClose: () => void
  children: ReactNode
}

const DEFAULT_POSITION: Position = { x: 24, y: 24 }

function loadPosition(storageKey: string): Position {
  try {
    const stored = sessionStorage.getItem(storageKey)
    if (!stored) return DEFAULT_POSITION
    const parsed = JSON.parse(stored)
    return typeof parsed?.x === 'number' && typeof parsed?.y === 'number' ? parsed : DEFAULT_POSITION
  } catch {
    return DEFAULT_POSITION
  }
}

function savePosition(storageKey: string, position: Position): void {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(position))
  } catch {
    // sessionStorage unavailable (e.g. private browsing quota) — position just won't persist.
  }
}

/** Generic draggable, touch-friendly floating window (fat grip header, minimize, close), position
 * persisted to sessionStorage — used to dock the encounter runner inside the dungeon page. */
export function FloatingWindow({ title, storageKey, onClose, children }: FloatingWindowProps) {
  const [position, setPosition] = useState<Position>(() => loadPosition(storageKey))
  const [minimized, setMinimized] = useState(false)
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!dragState.current) return
    const { startX, startY, originX, originY } = dragState.current
    setPosition({ x: originX + (event.clientX - startX), y: originY + (event.clientY - startY) })
  }, [])

  const stopDragging = useCallback(() => {
    dragState.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopDragging)
    setPosition((current) => {
      savePosition(storageKey, current)
      return current
    })
  }, [handlePointerMove, storageKey])

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDragging)
    }
  }, [handlePointerMove, stopDragging])

  const startDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragState.current = { startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDragging)
  }

  return (
    <div
      className={`floating-window ${minimized ? 'minimized' : ''}`}
      style={{ left: position.x, top: position.y }}
      role="dialog"
      aria-label={title}
    >
      <div className="floating-window-header" onPointerDown={startDragging}>
        <GripIcon size={16} aria-hidden className="floating-window-grip" />
        <span className="floating-window-title">{title}</span>
        <button
          type="button"
          className="floating-window-minimize"
          onClick={() => setMinimized((m) => !m)}
          aria-label={minimized ? 'Restore window' : 'Minimize window'}
        >
          {minimized ? '▢' : '−'}
        </button>
        <button type="button" className="floating-window-close" onClick={onClose} aria-label="Close window">
          <CloseIcon size={16} aria-hidden />
        </button>
      </div>
      {!minimized && <div className="floating-window-body">{children}</div>}
    </div>
  )
}
