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
})
