import { PreviewCard as Base } from '@base-ui/react/preview-card'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import './OverlayPrimitives.css'

export interface PreviewCardProps extends Omit<ComponentPropsWithoutRef<'a'>, 'children' | 'onChange'> {
  trigger: ReactNode; children: ReactNode; open?: boolean; defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void; delay?: number; closeDelay?: number; popupClassName?: string
}
export function PreviewCard({ trigger, children, open, defaultOpen, onOpenChange, delay, closeDelay, popupClassName, className, ...props }: PreviewCardProps) {
  return <Base.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
    <Base.Trigger {...props} delay={delay} closeDelay={closeDelay} className={['overlay-preview-trigger', className].filter(Boolean).join(' ')}>{trigger}</Base.Trigger>
    <Base.Portal><Base.Positioner className="overlay-positioner" sideOffset={8}><Base.Popup className={['overlay-preview-popup', popupClassName].filter(Boolean).join(' ')}><Base.Arrow className="overlay-arrow" />{children}</Base.Popup></Base.Positioner></Base.Portal>
  </Base.Root>
}
