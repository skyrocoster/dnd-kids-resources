import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Button } from './Button'
import './IconButton.css'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string
  children: ReactNode
}

export function IconButton({ label, children, disabled, className, ...rest }: IconButtonProps) {
  return (
    <Button
      variant="ghost"
      size="compact"
      className={['btn', 'btn--ghost', 'btn--compact', 'icon-btn', className].filter(Boolean).join(' ')}
      aria-label={label}
      disabled={disabled}
      type="button"
      {...rest}
    >
      {children}
    </Button>
  )
}
