import { ScrollArea as BaseScrollArea } from '@base-ui/react/scroll-area'
import type { ComponentPropsWithoutRef } from 'react'
import './ContentPrimitives.css'

export type ScrollAreaOrientation = 'vertical' | 'horizontal' | 'both'
export interface ScrollAreaProps extends ComponentPropsWithoutRef<'div'> {
  orientation?: ScrollAreaOrientation
  viewportClassName?: string
  contentClassName?: string
  scrollbarClassName?: string
}

export function ScrollArea({ orientation = 'vertical', viewportClassName, contentClassName, scrollbarClassName, className, children, ...rest }: ScrollAreaProps) {
  const scrollbarClasses = ['cp-scrollbar', scrollbarClassName].filter(Boolean).join(' ')
  return <BaseScrollArea.Root {...rest} className={['cp-scroll-area', className].filter(Boolean).join(' ')}>
    <BaseScrollArea.Viewport className={['cp-scroll-viewport', viewportClassName].filter(Boolean).join(' ')}><BaseScrollArea.Content className={['cp-scroll-content', contentClassName].filter(Boolean).join(' ')}>{children}</BaseScrollArea.Content></BaseScrollArea.Viewport>
    {orientation !== 'horizontal' && <BaseScrollArea.Scrollbar className={scrollbarClasses} orientation="vertical"><BaseScrollArea.Thumb className="cp-scroll-thumb" /></BaseScrollArea.Scrollbar>}
    {orientation !== 'vertical' && <BaseScrollArea.Scrollbar className={scrollbarClasses} orientation="horizontal"><BaseScrollArea.Thumb className="cp-scroll-thumb" /></BaseScrollArea.Scrollbar>}
    {orientation === 'both' && <BaseScrollArea.Corner className="cp-scroll-corner" />}
  </BaseScrollArea.Root>
}
