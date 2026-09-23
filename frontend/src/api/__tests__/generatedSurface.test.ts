import { describe, expect, it } from 'vitest'
import * as sdk from '../generated/sdk.gen'
import { apiClient, getAbilities, listSpells, queryInvalidation, queryKeys } from '../client'

describe('generated API surface', () => {
  it('configures one shared generated client with the Vite API base URL', () => {
    expect(apiClient.getConfig()).toMatchObject({
      baseUrl: (import.meta.env.VITE_API_BASE_URL?.trim() || window.location.origin).replace(/\/+$/, ''),
      responseStyle: 'fields',
      throwOnError: true,
    })
  })

  it('exposes generated endpoint operations through the central client module', () => {
    expect(typeof sdk.getAbilities).toBe('function')
    expect(typeof sdk.listSpells).toBe('function')
    expect(typeof getAbilities).toBe('function')
    expect(typeof listSpells).toBe('function')
    expect('getHealth' in sdk).toBe(false)
  })

  it('provides canonical keys and invalidation for connected features', () => {
    expect(queryKeys.spells.detail(12)).toEqual(['spells', 'detail', 12])
    expect(queryKeys.dungeons.sessionState(5)).toEqual(['dungeons', 5, 'session-state'])
    expect(queryKeys.loom.tapestry).toEqual(['loom', 'tapestry'])
    expect(typeof queryInvalidation.spells).toBe('function')
    expect(typeof queryInvalidation.dungeons).toBe('function')
    expect(typeof queryInvalidation.loom).toBe('function')
  })
})
