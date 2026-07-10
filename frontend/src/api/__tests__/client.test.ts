import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getAbilities, createSpell, deleteSpell } from '../client'

function mockFetchOnce(response: Partial<Response> & { jsonBody?: unknown }) {
  const { jsonBody, ...rest } = response
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => JSON.stringify(jsonBody ?? {}),
    json: async () => jsonBody,
    ...rest,
  } as Response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GET requests hit the /api-prefixed path and parse JSON', async () => {
    const fetchMock = mockFetchOnce({ jsonBody: [{ id: 1, name: 'Strength', description: null }] })

    const result = await getAbilities()

    expect(fetchMock).toHaveBeenCalledWith('/api/abilities', expect.objectContaining({ headers: expect.any(Object) }))
    expect(result).toEqual([{ id: 1, name: 'Strength', description: null }])
  })

  it('POST requests send a JSON body', async () => {
    const fetchMock = mockFetchOnce({ jsonBody: { id: 1, spell_name: 'Fireball' } })

    await createSpell({ spell_name: 'Fireball' } as never)

    const [path, options] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/spells')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ spell_name: 'Fireball' })
  })

  it('DELETE requests return undefined on a 204 response', async () => {
    mockFetchOnce({ status: 204 })

    await expect(deleteSpell(1)).resolves.toBeUndefined()
  })

  it('throws ApiError with the response status on a non-OK response', async () => {
    mockFetchOnce({ ok: false, status: 404, statusText: 'Not Found', text: async () => 'Spell not found' })

    await expect(getAbilities()).rejects.toMatchObject(new ApiError(404, 'Spell not found'))
  })
})
