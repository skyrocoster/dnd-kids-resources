import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { CloseIcon, GripIcon } from './icons'
import './FloatingWindow.css'

interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

interface FloatingWindowProps {
  title: string
  storageKey: string
  onClose: () => void
  children: ReactNode
}

const MIN_WIDTH = 300
const MIN_HEIGHT = 240
const DEFAULT_SIZE: Size = { width: 380, height: 480 }
const RESIZE_STEP = 16

function viewportMaxSize(): Size {
  return {
    width: Math.floor(window.innerWidth * 0.92),
    height: Math.floor(window.innerHeight * 0.85),
  }
}

/** Clamp width/height between the minimum floor and the current viewport ceiling. */
export function clampSize(width: number, height: number): Size {
  const max = viewportMaxSize()
  return {
    width: Math.max(MIN_WIDTH, Math.min(width, max.width)),
    height: Math.max(MIN_HEIGHT, Math.min(height, max.height)),
  }
}

const DEFAULT_POSITION: Position = { x: 24, y: 24 }

/** Clamp position to keep the window within viewport bounds. */
function clampPosition(x: number, y: number, windowWidth: number, windowHeight: number): Position {
  const maxX = Math.max(0, window.innerWidth - windowWidth)
  const maxY = Math.max(0, window.innerHeight - windowHeight)
  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
  }
}

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

function loadSize(storageKey: string): Size {
  try {
    const stored = sessionStorage.getItem(`${storageKey}:size`)
    if (!stored) return DEFAULT_SIZE
    const parsed = JSON.parse(stored)
    return typeof parsed?.width === 'number' && typeof parsed?.height === 'number'
      ? clampSize(parsed.width, parsed.height)
      : DEFAULT_SIZE
  } catch {
    return DEFAULT_SIZE
  }
}

function saveSize(storageKey: string, size: Size): void {
  try {
    sessionStorage.setItem(`${storageKey}:size`, JSON.stringify(size))
  } catch {
    // sessionStorage unavailable — size just won't persist.
  }
}

/** Generic draggable, touch-friendly floating window (fat grip header, minimize, close), position
 * and size persisted to sessionStorage — used to dock the encounter runner inside the dungeon page. */
export function FloatingWindow({ title, storageKey, onClose, children }: FloatingWindowProps) {
  const [position, setPosition] = useState<Position>(() => loadPosition(storageKey))
  const [size, setSize] = useState<Size>(() => loadSize(storageKey))
  const [minimized, setMinimized] = useState(false)

  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
  const resizeState = useRef<{ startX: number; startY: number; originSize: Size } | null>(null)
  const resizingRef = useRef(false)

  // ── Drag (position) ──────────────────────────────────────────────────

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!dragState.current) return
    const { startX, startY, originX, originY } = dragState.current
    const newX = originX + (event.clientX - startX)
    const newY = originY + (event.clientY - startY)
    setPosition(clampPosition(newX, newY, size.width, size.height))
  }, [size.width, size.height])

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
    if (resizingRef.current) return
    event.preventDefault()
    dragState.current = { startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDragging)
  }

  // ── Resize ───────────────────────────────────────────────────────────

  const handleResizeMove = useCallback((event: PointerEvent) => {
    if (!resizeState.current) return
    event.preventDefault()
    const { startX, startY, originSize } = resizeState.current
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    setSize(clampSize(originSize.width + dx, originSize.height + dy))
  }, [])

  const stopResizing = useCallback(() => {
    resizeState.current = null
    resizingRef.current = false
    document.body.style.userSelect = ''
    document.body.style.webkitUserSelect = ''
    window.removeEventListener('pointermove', handleResizeMove)
    window.removeEventListener('pointerup', stopResizing)
    setSize((current) => {
      saveSize(storageKey, current)
      return current
    })
  }, [handleResizeMove, storageKey])

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handleResizeMove)
      window.removeEventListener('pointerup', stopResizing)
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
    }
  }, [handleResizeMove, stopResizing])

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragState.current) return
    event.preventDefault()
    event.stopPropagation()
    resizingRef.current = true
    resizeState.current = { startX: event.clientX, startY: event.clientY, originSize: size }
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
    window.addEventListener('pointermove', handleResizeMove)
    window.addEventListener('pointerup', stopResizing)
  }

  const handleResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    let dx = 0
    let dy = 0
    switch (event.key) {
      case 'ArrowRight':
        dx = RESIZE_STEP
        break
      case 'ArrowLeft':
        dx = -RESIZE_STEP
        break
      case 'ArrowDown':
        dy = RESIZE_STEP
        break
      case 'ArrowUp':
        dy = -RESIZE_STEP
        break
      default:
        return
    }
    event.preventDefault()
    setSize((current) => {
      const next = clampSize(current.width + dx, current.height + dy)
      saveSize(storageKey, next)
      return next
    })
  }

  return (
    <div
      className={`floating-window ${minimized ? 'minimized' : ''}`}
      style={{ left: position.x, top: position.y, width: size.width, height: minimized ? undefined : size.height }}
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

      <div
        className="floating-window-resize-handle"
        onPointerDown={startResize}
        onKeyDown={handleResizeKeyDown}
        role="separator"
        aria-label="Resize window. Arrow keys to resize."
        aria-orientation="horizontal"
        tabIndex={0}
      >
        <span className="floating-window-resize-ridges" aria-hidden />
      </div>
    </div>
  )
}
