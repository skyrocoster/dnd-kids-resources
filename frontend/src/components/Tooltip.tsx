import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './Tooltip.css'

interface TooltipProviderProps {
  children: ReactNode
  delay?: number
  closeDelay?: number
}

interface TooltipProps {
  trigger: ReactNode
  content: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  delay?: number
  closeDelay?: number
  triggerProps?: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>
  popupClassName?: string
}

/** Shares hover-delay behavior between nearby tooltips. */
export function TooltipProvider({ children, delay, closeDelay }: TooltipProviderProps) {
  return (
    <BaseTooltip.Provider delay={delay} closeDelay={closeDelay}>
      {children}
    </BaseTooltip.Provider>
  )
}

/**
 * Sighted-user hint attached to a focusable trigger.
 *
 * Headless behavior comes from Base UI; visuals come from ./Tooltip.css and
 * the theme.css tokens (no ad-hoc colors, spacing, or radii).
 */
export function Tooltip({
  trigger,
  content,
  open,
  defaultOpen,
  onOpenChange,
  disabled,
  delay,
  closeDelay,
  triggerProps,
  popupClassName,
}: TooltipProps) {
  const { className: triggerClassName, ...restTriggerProps } = triggerProps ?? {}
  return (
    <BaseTooltip.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(nextOpen) => onOpenChange?.(nextOpen)}
      disabled={disabled}
    >
      <BaseTooltip.Trigger
        delay={delay}
        closeDelay={closeDelay}
        {...restTriggerProps}
        className={['tooltip-trigger', triggerClassName].filter(Boolean).join(' ')}
      >
        {trigger}
      </BaseTooltip.Trigger>
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner className="tooltip-positioner" sideOffset={8}>
          <BaseTooltip.Popup
            className={['tooltip-popup', popupClassName].filter(Boolean).join(' ')}
            role="tooltip"
          >
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  )
}
