import { describe, expect, it, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMapLayerVisibility } from '../MapLabPage'

describe('useMapLayerVisibility', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults all four layers to visible', () => {
    const { result } = renderHook(() => useMapLayerVisibility())
    expect(result.current.visible).toEqual({
      outside: true,
      props: true,
      passages: true,
      labels: true,
    })
  })

  it('toggling one key flips only that key', () => {
    const { result } = renderHook(() => useMapLayerVisibility())
    act(() => {
      result.current.toggleLayer('props')
    })
    expect(result.current.visible).toEqual({
      outside: true,
      props: false,
      passages: true,
      labels: true,
    })
  })

  it('persists visibility through localStorage across hook instances', () => {
    const first = renderHook(() => useMapLayerVisibility())
    act(() => {
      first.result.current.toggleLayer('labels')
    })
    expect(window.localStorage.getItem('dnd-kids-maplab-layer-visible:labels')).toBe('false')

    const second = renderHook(() => useMapLayerVisibility())
    expect(second.result.current.visible.labels).toBe(false)
    expect(second.result.current.visible.outside).toBe(true)
  })
})
