import { describe, expect, it, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMapLayerVisibility, useMapDensity, resolveMapDensity, AUTO_DENSITY_SIMPLE_THRESHOLD } from '../MapLabPage'

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

describe('useMapDensity', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to auto', () => {
    const { result } = renderHook(() => useMapDensity())
    expect(result.current.density).toBe('auto')
  })

  it('setting detailed stores and returns detailed', () => {
    const { result } = renderHook(() => useMapDensity())
    act(() => {
      result.current.setDensity('detailed')
    })
    expect(result.current.density).toBe('detailed')
    expect(window.localStorage.getItem('dnd-kids-maplab-density')).toBe('detailed')
  })

  it('setting simple stores and returns simple', () => {
    const { result } = renderHook(() => useMapDensity())
    act(() => {
      result.current.setDensity('simple')
    })
    expect(result.current.density).toBe('simple')
    expect(window.localStorage.getItem('dnd-kids-maplab-density')).toBe('simple')
  })

  it('persists density across hook instances', () => {
    const first = renderHook(() => useMapDensity())
    act(() => {
      first.result.current.setDensity('simple')
    })
    expect(window.localStorage.getItem('dnd-kids-maplab-density')).toBe('simple')

    const second = renderHook(() => useMapDensity())
    expect(second.result.current.density).toBe('simple')
  })
})

describe('resolveMapDensity', () => {
  it('detailed always returns detailed regardless of scale', () => {
    expect(resolveMapDensity('detailed', 0.1)).toBe('detailed')
    expect(resolveMapDensity('detailed', AUTO_DENSITY_SIMPLE_THRESHOLD)).toBe('detailed')
    expect(resolveMapDensity('detailed', 3)).toBe('detailed')
  })

  it('simple always returns simple regardless of scale', () => {
    expect(resolveMapDensity('simple', 0.1)).toBe('simple')
    expect(resolveMapDensity('simple', AUTO_DENSITY_SIMPLE_THRESHOLD)).toBe('simple')
    expect(resolveMapDensity('simple', 3)).toBe('simple')
  })

  it('auto returns simple below threshold and detailed at or above threshold', () => {
    expect(resolveMapDensity('auto', AUTO_DENSITY_SIMPLE_THRESHOLD - 0.01)).toBe('simple')
    expect(resolveMapDensity('auto', AUTO_DENSITY_SIMPLE_THRESHOLD)).toBe('detailed')
    expect(resolveMapDensity('auto', AUTO_DENSITY_SIMPLE_THRESHOLD + 0.01)).toBe('detailed')
  })
})
