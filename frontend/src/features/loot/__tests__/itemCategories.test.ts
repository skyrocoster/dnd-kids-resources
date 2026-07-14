import { describe, expect, it } from 'vitest'
import { PackageIcon } from '../../../components/icons'
import { categoryIcon } from '../itemCategories'

describe('categoryIcon', () => {
  it('falls back to the package icon for unknown categories', () => {
    expect(categoryIcon('unknown')).toBe(PackageIcon)
  })
})
