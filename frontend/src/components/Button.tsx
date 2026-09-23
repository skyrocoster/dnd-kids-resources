import { Button as BaseButton } from '@base-ui/react/button'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './Button.css'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'normal' | 'compact'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'normal',
  loading = false,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  // Rendered through the Base UI headless Button (a <button>) so behavior,
  // disabled handling, and focus stay consistent with future Base UI
  // primitives. Visuals still come from ./Button.css and the theme.css tokens.
  return (
    <BaseButton
      className={`btn btn--${variant} btn--${size}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {children}
    </BaseButton>
  )
}
