// Hook stub for nav collapse functionality (DP0 scaffolding)

export interface NavCollapseState {
  collapsed: boolean
  toggle: () => void
}

export function useNavCollapse(): NavCollapseState {
  return {
    collapsed: false,
    toggle: () => {},
  }
}
