import { afterEach, describe, expect, it, vi } from 'vitest'

describe('router', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('includes the demo route in development', async () => {
    vi.stubEnv('DEV', true)
    const { routes } = await import('../router')
    const children = routes[0].children ?? []
    expect(children.some((route) => route.path === 'demo')).toBe(true)
  })

  it('excludes the demo route outside development', async () => {
    vi.stubEnv('DEV', false)
    const { routes } = await import('../router')
    const children = routes[0].children ?? []
    expect(children.some((route) => route.path === 'demo')).toBe(false)
  })

  it('includes a top-level /play route', async () => {
    const { routes } = await import('../router')
    const playRoute = routes.find((r) => r.path === '/play')
    expect(playRoute).toBeDefined()
  })

  it('keeps /play destinations outside the app shell route family', async () => {
    const { routes } = await import('../router')
    const appChildren = routes[0].children ?? []
    const playRoute = routes.find((r) => r.path === '/play')

    expect(appChildren.some((route) => route.path === 'play' || route.path === 'play/map')).toBe(false)
    expect(playRoute?.children?.some((route) => route.index)).toBe(true)
    expect(playRoute?.children?.some((route) => route.path === 'map')).toBe(true)
    expect(playRoute?.children?.some((route) => route.path === 'spells')).toBe(true)
  })
})
