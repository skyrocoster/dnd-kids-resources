import { Menu as BaseMenu } from '@base-ui/react/menu'
import type { MenuPositionerProps } from '@base-ui/react/menu'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { MenuItemContent } from './MenuItemContent'
import type { MenuItemDefinition } from './menuTypes'
import './menus.css'

export interface MenuProps {
  trigger: ReactNode
  items: readonly MenuItemDefinition[]
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  modal?: boolean
  loopFocus?: boolean
  triggerClassName?: string
  popupClassName?: string
  triggerProps?: Omit<ComponentPropsWithoutRef<'button'>, 'children'>
  positionerProps?: Omit<MenuPositionerProps, 'className'>
}

/** Button-triggered action or navigation menu. */
export function Menu({
  trigger,
  items,
  open,
  defaultOpen,
  onOpenChange,
  disabled,
  modal,
  loopFocus,
  triggerClassName,
  popupClassName,
  triggerProps,
  positionerProps,
}: MenuProps) {
  return (
    <BaseMenu.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(nextOpen) => onOpenChange?.(nextOpen)}
      disabled={disabled}
      modal={modal}
      loopFocus={loopFocus}
    >
      <BaseMenu.Trigger
        {...triggerProps}
        className={['ds-menu-trigger', triggerClassName, triggerProps?.className]
          .filter(Boolean)
          .join(' ')}
      >
        {trigger}
      </BaseMenu.Trigger>
      <BaseMenu.Portal>
        <BaseMenu.Positioner
          sideOffset={4}
          {...positionerProps}
          className="ds-menu-positioner"
        >
          <BaseMenu.Popup className={['ds-menu-popup', popupClassName].filter(Boolean).join(' ')}>
            {items.map((item) => {
              if ('separator' in item) {
                return <BaseMenu.Separator className="ds-menu-separator" key={item.id} />
              }

              if (item.href) {
                return (
                  <BaseMenu.LinkItem
                    className="ds-menu-item"
                    href={item.href}
                    target={item.target}
                    label={item.textValue}
                    closeOnClick={item.closeOnSelect}
                    key={item.id}
                  >
                    <MenuItemContent item={item} />
                  </BaseMenu.LinkItem>
                )
              }

              return (
                <BaseMenu.Item
                  className="ds-menu-item"
                  disabled={item.disabled}
                  label={item.textValue}
                  closeOnClick={item.closeOnSelect}
                  onClick={() => item.onSelect?.()}
                  key={item.id}
                >
                  <MenuItemContent item={item} />
                </BaseMenu.Item>
              )
            })}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  )
}
