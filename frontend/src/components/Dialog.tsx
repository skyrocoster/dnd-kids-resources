import { useId } from 'react'
import type { ReactNode } from 'react'
import './Dialog.css'

interface DialogProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  pending?: boolean
}

export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  pending: _pending,
}: DialogProps) {
  const titleId = useId()
  const descId = useId()

  if (!open) return null

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dialog-header">
          <h2 id={titleId} className="dialog-title">{title}</h2>
          {description && <p id={descId} className="dialog-description">{description}</p>}
        </header>
        <div className="dialog-body">{children}</div>
        {footer && <footer className="dialog-footer">{footer}</footer>}
      </div>
    </div>
  )
}
