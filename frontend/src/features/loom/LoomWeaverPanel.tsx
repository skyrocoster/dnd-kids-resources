import type { LoomNode, LoomEdge, LoomThread } from '../../api/types'

export interface LoomWeaverPanelProps {
  selectedNode: LoomNode | null
  selectedEdge: LoomEdge | null
  threads: LoomThread[]
  vaultNodes: LoomNode[]
  canBridgeFromSelected: boolean
  bridgeSource: LoomNode | null
  onBridge: () => void
  onMarkReached: () => void
  onMarkAbandoned: () => void
  onEdit: () => void
  onDeleteNode: () => void
  onDeleteEdge: () => void
  onSelectVaultNode: (node: LoomNode) => void
  onOpenThreadManager: () => void
  onCancelBridge: () => void
}

/** Persistent right-hand rail replacing the transient inspector strip and vault panel.
 *  Sections: Selection (or Legend when nothing selected) + Threads + Idea Vault.
 *  LU2 — Weaver's panel will implement the full rail layout with Selection/Legend/Vault sections. */
export function LoomWeaverPanel(_props: LoomWeaverPanelProps) {
  return null
}
