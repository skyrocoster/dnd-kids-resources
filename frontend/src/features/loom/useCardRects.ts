import { useCallback, useEffect, useRef, useState } from 'react'
import type { CardRect } from './swimlaneTypes'

/**
 * Manages card element refs and measures their rects relative to the scroll
 * content of the swimlanes container.
 *
 * Returns:
 * - `registerCard(nodeId, threadId, el)` — called from LoomNodeCard via ref callback
 * - `cardRects` — current map of nodeId → CardRect
 * - `scrollRef` — ref to attach to the .loom-swimlanes scroll container
 */
export function useCardRects() {
  const scrollRef = useRef<HTMLElement | null>(null)
  const elsRef = useRef<Map<number, { el: HTMLElement; threadId: number }>>(new Map())
  const [cardRects, setCardRects] = useState<Map<number, CardRect>>(new Map())

  const measure = useCallback(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return
    const scrollRect = scrollEl.getBoundingClientRect()
    const scrollLeft = scrollEl.scrollLeft
    const scrollTop = scrollEl.scrollTop

    const next = new Map<number, CardRect>()
    for (const [nodeId, { el, threadId }] of elsRef.current) {
      const r = el.getBoundingClientRect()
      next.set(nodeId, {
        nodeId,
        threadId,
        left: r.left - scrollRect.left + scrollLeft,
        top: r.top - scrollRect.top + scrollTop,
        width: r.width,
        height: r.height,
      })
    }
    setCardRects(next)
  }, [])

  const registerCard = useCallback(
    (nodeId: number, threadId: number, el: HTMLElement | null) => {
      if (el) {
        elsRef.current.set(nodeId, { el, threadId })
      } else {
        elsRef.current.delete(nodeId)
      }
    },
    [],
  )

  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return

    measure()

    const onScroll = () => requestAnimationFrame(measure)
    scrollEl.addEventListener('scroll', onScroll, { passive: true })

    const ro = new ResizeObserver(() => measure())
    ro.observe(scrollEl)

    return () => {
      scrollEl.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [measure])

  return { scrollRef, registerCard, cardRects, measure }
}
