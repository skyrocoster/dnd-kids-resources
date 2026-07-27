import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyMapLayout } from '../../model/maplabModel'
import { PlayerHome, PlayerMapRoute } from '../PlayerShell'
import type { KidMapLayout } from '../curtain'
import { usePlayerMapData } from '../usePlayerMapData'


vi.mock('../usePlayerMapData')

const mockedUsePlayerMapData = vi.mocked(usePlayerMapData)

describe('PlayerShell', () => {
  beforeEach(() => {
    mockedUsePlayerMapData.mockReturnValue({
      dungeonId: null,
      layout: null,
      status: 'empty',
      error: null,
    })
  })

  it('renders the Map destination as a native route target', () => {
    render(<PlayerHome />)
    expect(screen.getByRole('link', { name: /map/i })).toHaveAttribute('href', '/play/map')
  })

  it('renders the loading message', () => {
    mockedUsePlayerMapData.mockReturnValue({
      dungeonId: null,
      layout: null,
      status: 'loading',
      error: null,
    })
    render(<PlayerMapRoute />)
    expect(screen.getByText('Loading map…')).toBeInTheDocument()
  })

  it('renders the empty message', () => {
    render(<PlayerMapRoute />)
    expect(screen.getByText('No map yet.')).toBeInTheDocument()
  })

  it('renders the load error message', () => {
    mockedUsePlayerMapData.mockReturnValue({
      dungeonId: null,
      layout: null,
      status: 'error',
      error: new Error('offline'),
    })
    render(<PlayerMapRoute />)
    expect(screen.getByText("The map didn't load. Ask your DM.")).toBeInTheDocument()
  })

  it('renders a ready map full-screen', () => {
    mockedUsePlayerMapData.mockReturnValue({
      dungeonId: 7,
      layout: createEmptyMapLayout('School') as unknown as KidMapLayout,
      status: 'ready',
      error: null,
    })
    render(<PlayerMapRoute />)
    expect(screen.getByRole('region', { name: 'Dungeon map' })).toBeInTheDocument()
  })

  it('does not render an exit from the map route', () => {
    render(<PlayerMapRoute />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('each player-destination meets the 64px kid touch-target floor', () => {
    render(<PlayerHome />)
    const dest = screen.getByRole('link', { name: /map/i })
    const minHeight = parseFloat(getComputedStyle(dest).minHeight)
    expect(minHeight).toBeGreaterThanOrEqual(64)
  })
})
