import { expect, test, type Page } from '@playwright/test'
import type { Weapon } from '../../src/api/types'

const weapons: Weapon[] = [
  {
    id: 1,
    name: 'Longsword',
    base_weapon: 'Longsword',
    rarity: null,
    weapon_category: 'martial',
    weight: 3,
    req_attune: null,
    property: ['V'],
    focus: [],
    attack: [{ type: 'melee', damage: '1d8', damage_type: 'slashing', hands: 1 }],
    entries: ['A sturdy blade.'],
    quick_rules: 'Attack +{weapon_attack_bonus}',
    weapon_attack_bonus: 6,
    weapon_damage_bonus: null,
  },
  {
    id: 2,
    name: '+1 Moon Sickle',
    base_weapon: 'Sickle',
    rarity: 'uncommon',
    weapon_category: 'simple',
    weight: 2,
    req_attune: 'by a druid or ranger',
    property: ['L'],
    focus: ['Druid', 'Ranger'],
    attack: [{ type: 'melee', damage: '1d4', damage_type: 'slashing', hands: 1 }],
    entries: ['This silver-bladed sickle glimmers softly.'],
    quick_rules: 'Attack +{weapon_attack_bonus}',
    weapon_attack_bonus: 7,
    weapon_damage_bonus: null,
  },
]

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  }
}

async function mockWeaponReferenceData(page: Page) {
  await page.route('**/api/weapon_properties', (route) => route.fulfill(jsonResponse([])))
  await page.route('**/api/damage_types', (route) => route.fulfill(jsonResponse([])))
}

test('searches the weapon list and opens the selected weapon details', async ({ page }) => {
  await page.route('**/api/weapons', (route) => route.fulfill(jsonResponse(weapons)))

  await page.goto('/weapons')
  await expect(page.getByRole('heading', { name: 'Weapons' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '+1 Moon Sickle' })).toBeVisible()

  await page.getByRole('searchbox', { name: 'Search weapons…' }).fill('longsword')
  await expect(page.getByRole('button', { name: 'Longsword' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Moon Sickle/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Longsword' }).click()

  await expect(page.getByRole('heading', { name: 'Longsword' })).toBeVisible()
  await expect(page.getByText('A sturdy blade.')).toBeVisible()
})

test('edits a weapon and refreshes its displayed details', async ({ page }) => {
  let listedWeapons = [...weapons]
  let updatePayload: Record<string, unknown> | undefined

  await page.route('**/api/weapons', (route) => route.fulfill(jsonResponse(listedWeapons)))
  await page.route('**/api/weapons/2', async (route) => {
    if (route.request().method() !== 'PUT') {
      await route.fallback()
      return
    }

    updatePayload = route.request().postDataJSON() as Record<string, unknown>
    const savedWeapon = { ...weapons[1], ...updatePayload }
    listedWeapons = listedWeapons.map((weapon) => (weapon.id === savedWeapon.id ? savedWeapon : weapon))
    await route.fulfill(jsonResponse(savedWeapon))
  })
  await mockWeaponReferenceData(page)

  await page.goto('/weapons')
  await page.getByRole('button', { name: 'Edit' }).click()

  const dialog = page.getByRole('dialog', { name: 'Edit Weapon: +1 Moon Sickle' })
  await expect(dialog).toBeVisible()
  await page.getByLabel('Name').fill('Moon Sickle of the Grove')
  await page.getByRole('button', { name: 'Save Changes' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Moon Sickle of the Grove' })).toBeVisible()
  expect(updatePayload).toMatchObject({ name: 'Moon Sickle of the Grove' })
})

test('creates a weapon and adds it to the browser list', async ({ page }) => {
  let listedWeapons: Weapon[] = []
  let createPayload: Record<string, unknown> | undefined

  await page.route('**/api/weapons', async (route) => {
    if (route.request().method() === 'POST') {
      createPayload = route.request().postDataJSON() as Record<string, unknown>
      const createdWeapon: Weapon = {
        id: 9,
        name: String(createPayload.name),
        quick_rules: String(createPayload.quick_rules),
      }
      listedWeapons = [createdWeapon]
      await route.fulfill(jsonResponse(createdWeapon, 201))
      return
    }

    await route.fulfill(jsonResponse(listedWeapons))
  })
  await mockWeaponReferenceData(page)

  await page.goto('/weapons')
  await page.getByRole('button', { name: 'New Weapon' }).click()
  await page.getByLabel('Name').fill('Ashen Staff')
  await page.getByLabel('Quick Rules').fill('A staff made from pale ash.')
  await page.getByRole('button', { name: 'Create Weapon' }).click()

  await expect(page.getByRole('heading', { name: 'Ashen Staff' })).toBeVisible()
  expect(createPayload).toMatchObject({ name: 'Ashen Staff', quick_rules: 'A staff made from pale ash.' })
})

test('rejects an unknown quick-rule token before sending the create request', async ({ page }) => {
  let createRequestCount = 0

  await page.route('**/api/weapons', async (route) => {
    if (route.request().method() === 'POST') createRequestCount += 1
    await route.fulfill(jsonResponse([]))
  })
  await mockWeaponReferenceData(page)

  await page.goto('/weapons')
  await page.getByRole('button', { name: 'New Weapon' }).click()
  await page.getByLabel('Name').fill('Broken Wand')
  await page.getByLabel('Quick Rules').fill('Attack with {unknown_bonus}.')
  await page.getByRole('button', { name: 'Create Weapon' }).click()

  await expect(page.getByRole('dialog', { name: 'Add New Weapon' }).getByRole('status')).toContainText(
    'Unknown token: unknown_bonus',
  )
  expect(createRequestCount).toBe(0)
})
