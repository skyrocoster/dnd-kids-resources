export function getFellDividerElement(): HTMLElement | null {
  return document.querySelector('[aria-label="Current position"]') as HTMLElement | null
}

export function getLoomGridElement(): HTMLElement | null {
  return document.querySelector('.loom-grid') as HTMLElement | null
}

export function isFellDividerFullyVisible(gridElement: HTMLElement, dividerElement: HTMLElement): boolean {
  if (!gridElement || !dividerElement) return false

  const gridRect = gridElement.getBoundingClientRect()
  const dividerRect = dividerElement.getBoundingClientRect()

  const isWithinHorizontal = dividerRect.left >= gridRect.left && dividerRect.right <= gridRect.right

  return isWithinHorizontal
}

export function scrollToFellDivider(gridElement: HTMLElement, dividerElement: HTMLElement): void {
  if (!gridElement || !dividerElement) return

  const gridRect = gridElement.getBoundingClientRect()
  const dividerRect = dividerElement.getBoundingClientRect()

  const gridScroll = gridElement.scrollLeft
  const offsetLeft = dividerRect.left - gridRect.left

  gridElement.scrollLeft = gridScroll + offsetLeft
}
