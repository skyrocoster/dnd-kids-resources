import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import './Dialog.css'

interface DialogProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children?: ReactNode
  footer?: ReactNode
  pending?: boolean
  role?: 'dialog' | 'alertdialog'
  className?: string
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  pending = false,
  role = 'dialog',
  className,
}: DialogProps) {
  const titleId = useId()
  const descId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Move focus into the dialog on open and restore it to the trigger on close.
  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const dialogEl = dialogRef.current
    const focusable = dialogEl?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    const first = focusable && focusable.length > 0 ? focusable[0] : dialogEl
    first?.focus()

    return () => {
      previouslyFocused?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (pending) return
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const dialogEl = dialogRef.current
      if (!dialogEl) return
      const focusable = Array.from(dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, pending, onClose])

  if (!open) return null

  function handleBackdropClick() {
    if (pending) return
    onClose()
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        className={className ? `dialog ${className}` : 'dialog'}
        role={role}
        aria-modal="true"
        aria-busy={pending || undefined}
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dialog-header">
          <h2 id={titleId} className="dialog-title">{title}</h2>
          {description && <p id={descId} className="dialog-description">{description}</p>}
        </header>
        <fieldset className="dialog-fieldset" disabled={pending} inert={pending}>
          {children && <div className="dialog-body">{children}</div>}
          {footer && <footer className="dialog-footer">{footer}</footer>}
        </fieldset>
      </div>
    </div>
  )
}
