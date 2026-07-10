import type { ReactNode } from 'react'
import './Card.css'

export type CardVariant = 'spell' | 'monster' | 'weapon' | 'neutral'

interface CardProps {
  title: string
  subtitle?: string
  tag?: string
  variant?: CardVariant
  children?: ReactNode
  footer?: ReactNode
}

export function Card({ title, subtitle, tag, variant = 'neutral', children, footer }: CardProps) {
  return (
    <article className="card" data-variant={variant}>
      <header className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
        {tag && <span className="card-tag">{tag}</span>}
      </header>
      {children && <div className="card-body">{children}</div>}
      {footer && <footer className="card-footer">{footer}</footer>}
    </article>
  )
}
