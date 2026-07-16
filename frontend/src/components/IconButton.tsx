import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './IconButton.css'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string
  children: ReactNode
}

export function IconButton({ label, children, disabled, ...rest }: IconButtonProps) {
  return (
    <button
      className="icon-btn"
      aria-label={label}
      disabled={disabled}
      type="button"
      {...rest}
    >
      {children}
    </button>
  )
}
