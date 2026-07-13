import { useCallback, useState } from 'react'

const STORAGE_KEY = 'dnd-kids-nav-collapsed'

export interface NavCollapseState {
  collapsed: boolean
  toggle: () => void
}

function readStoredCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function useNavCollapse(): NavCollapseState {
  const [collapsed, setCollapsed] = useState<boolean>(readStoredCollapsed)

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // localStorage unavailable (e.g. private mode) — collapse state just won't persist
      }
      return next
    })
  }, [])

  return { collapsed, toggle }
}
