import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  createMonster,
  createSpell,
  deleteMonster,
  deleteSpell,
  getAbilities,
  updateMonster,
} from '../client'
import { targetSpell } from '../../features/spells/__tests__/spellFixtures'

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
    const { id, ...spell } = targetSpell
    const fetchMock = mockFetchOnce({ jsonBody: targetSpell })

    await createSpell(spell)

    const [path, options] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/spells')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual(spell)
  })

  it('DELETE requests return undefined on a 204 response', async () => {
    mockFetchOnce({ status: 204 })

    await expect(deleteSpell(1)).resolves.toBeUndefined()
  })

  it('monster CRUD functions hit the expected endpoints', async () => {
    const monster = { name: 'Tiny Test Drake', cr: '1/2' }
    const fetchMock = mockFetchOnce({ jsonBody: { id: 42, ...monster } })

    await createMonster(monster)
    await updateMonster(42, { name: 'Tiny Test Drake Updated' })
    const deleteFetchMock = mockFetchOnce({ status: 204 })
    await deleteMonster(42)

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/monsters',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(monster) }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/monsters/42',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ name: 'Tiny Test Drake Updated' }) }),
    )
    expect(deleteFetchMock).toHaveBeenCalledWith(
      '/api/monsters/42',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('throws ApiError with the response status on a non-OK response', async () => {
    mockFetchOnce({ ok: false, status: 404, statusText: 'Not Found', text: async () => 'Spell not found' })

    await expect(getAbilities()).rejects.toMatchObject(new ApiError(404, 'Spell not found'))
  })
})
