import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import './GlossaryTerm.css'

interface GlossaryTermProps {
  children: ReactNode
  content: ReactNode
}

let closeActivePopover: (() => void) | null = null

export function GlossaryTerm({ children, content }: GlossaryTermProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const openedByPressRef = useRef(false)
  const popoverId = useId()

  function close() {
    openedByPressRef.current = false
    setOpen(false)
    if (closeActivePopover === close) closeActivePopover = null
  }

  function show() {
    closeActivePopover?.()
    closeActivePopover = close
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) close()
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        close()
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  useEffect(() => () => {
    if (closeActivePopover === close) closeActivePopover = null
  }, [])

  useLayoutEffect(() => {
    if (!open) return

    function positionPopover() {
      const trigger = triggerRef.current
      const popover = popoverRef.current
      if (!trigger || !popover) return

      const gap = 4
      const triggerRect = trigger.getBoundingClientRect()
      const popoverRect = popover.getBoundingClientRect()
      const left = Math.min(
        Math.max(gap, triggerRect.left),
        Math.max(gap, window.innerWidth - popoverRect.width - gap),
      )
      const below = triggerRect.bottom + gap
      const top = below + popoverRect.height <= window.innerHeight - gap
        ? below
        : Math.max(gap, triggerRect.top - popoverRect.height - gap)

      popover.style.left = `${left}px`
      popover.style.top = `${top}px`
    }

    positionPopover()
    window.addEventListener('resize', positionPopover)
    window.addEventListener('scroll', positionPopover, true)
    return () => {
      window.removeEventListener('resize', positionPopover)
      window.removeEventListener('scroll', positionPopover, true)
    }
  }, [open])

  return (
    <span className="glossary-term">
      <button
        ref={triggerRef}
        className="glossary-term-trigger"
        type="button"
        aria-describedby={open ? popoverId : undefined}
        aria-expanded={open}
        onPointerUp={() => {
          if (openedByPressRef.current) close()
          else {
            openedByPressRef.current = true
            show()
          }
        }}
        onClick={(event) => {
          if (event.detail !== 0) return
          if (openedByPressRef.current) close()
          else {
            openedByPressRef.current = true
            show()
          }
        }}
        onMouseEnter={show}
        onFocus={show}
        onBlur={(event) => {
          if (!popoverRef.current?.contains(event.relatedTarget as Node | null)) close()
        }}
      >
        {children}
      </button>
      {open && (
        <span id={popoverId} ref={popoverRef} className="glossary-term-popover" role="tooltip">
          {content}
        </span>
      )}
    </span>
  )
}
