// DP1: Kid-palette solver tests
// Run with: node --test scripts/derive-kid-palette.test.mjs

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  solvePalette,
  formatTokenBlock,
  deltaE2000,
  FAMILY_SPEC,
  RESERVED_HEXES,
  BACKGROUND_LSTARS,
} from './derive-kid-palette.mjs'
import { Hct, Contrast, argbFromHex, lstarFromArgb, labFromArgb, yFromLstar } from '../frontend/node_modules/@material/material-color-utilities/index.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexRelLum(hex) {
  const lstar = lstarFromArgb(argbFromHex(hex))
  return yFromLstar(lstar) / 100
}

function hexToLab(hex) {
  const [L, a, b] = labFromArgb(argbFromHex(hex))
  return { L, a, b }
}

const FAMILY_KEYS = Object.keys(FAMILY_SPEC)

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('kid palette solver', () => {
  it('is deterministic — repeated calls produce identical results', () => {
    const a = solvePalette()
    const b = solvePalette()
    assert.deepEqual(a, b)
  })

  it('returns all four families', () => {
    const result = solvePalette()
    for (const key of FAMILY_KEYS) {
      assert.ok(key in result, `missing family "${key}"`)
    }
  })

  it('every family has a disc and glyph colour', () => {
    const result = solvePalette()
    for (const key of FAMILY_KEYS) {
      assert.ok(result[key].disc, `"${key}" disc missing`)
      assert.ok(result[key].glyph, `"${key}" glyph missing`)
      assert.match(result[key].disc, /^#[0-9A-Fa-f]{6}$/, `"${key}" disc not hex`)
    }
  })

  it('glyph colour is either black or white', () => {
    const result = solvePalette()
    for (const key of FAMILY_KEYS) {
      const glyph = result[key].glyph
      assert.ok(glyph === '#000000' || glyph === '#FFFFFF',
        `"${key}" glyph is ${glyph}, expected #000000 or #FFFFFF`)
    }
  })

  it('each glyph has ≥4.5:1 contrast on its disc', () => {
    const result = solvePalette()
    for (const key of FAMILY_KEYS) {
      const discLum = hexRelLum(result[key].disc)
      const glyphLum = hexRelLum(result[key].glyph)
      const cr = (Math.max(discLum, glyphLum) + 0.05) / (Math.min(discLum, glyphLum) + 0.05)
      assert.ok(cr >= 4.5, `"${key}" glyph contrast on disc is ${cr.toFixed(2)}:1, expected ≥4.5:1`)
    }
  })

  it('all families pass contrast floor (≥4.5:1) against both backgrounds', () => {
    const result = solvePalette()
    for (const key of FAMILY_KEYS) {
      const discLstar = result[key].tone
      for (const bgL of BACKGROUND_LSTARS) {
        const cr = Contrast.ratioOfTones(discLstar, bgL)
        assert.ok(cr >= 4.5,
          `"${key}" (L* ${discLstar.toFixed(1)}) vs background L* ${bgL}: contrast ${cr.toFixed(2)}:1, expected ≥4.5:1`)
      }
    }
  })

  it('ΔE2000 between any two family colours is ≥15', () => {
    const result = solvePalette()
    const labs = Object.fromEntries(
      Object.entries(result).map(([k, v]) => [k, hexToLab(v.disc)])
    )
    for (let i = 0; i < FAMILY_KEYS.length; i++) {
      for (let j = i + 1; j < FAMILY_KEYS.length; j++) {
        const de = deltaE2000(labs[FAMILY_KEYS[i]], labs[FAMILY_KEYS[j]])
        assert.ok(de >= 15,
          `ΔE2000(${FAMILY_KEYS[i]}, ${FAMILY_KEYS[j]}) = ${de.toFixed(1)}, expected ≥15`)
      }
    }
  })

  it('minimum ΔL* between any two families is ≥2.5', () => {
    const result = solvePalette()
    const tones = Object.values(result).map(v => v.tone)
    for (let i = 0; i < tones.length; i++) {
      for (let j = i + 1; j < tones.length; j++) {
        const dl = Math.abs(tones[i] - tones[j])
        assert.ok(dl >= 2.5,
          `ΔL* between pair = ${dl.toFixed(1)}, expected ≥2.5`)
      }
    }
  })

  it('ΔE2000 from each family colour to each reserved colour is ≥10', () => {
    const result = solvePalette()
    const reservedLabs = RESERVED_HEXES.map(hexToLab)

    for (const key of FAMILY_KEYS) {
      const familyLab = hexToLab(result[key].disc)
      for (let ri = 0; ri < RESERVED_HEXES.length; ri++) {
        const de = deltaE2000(familyLab, reservedLabs[ri])
        assert.ok(de >= 10,
          `ΔE2000(${key}, reserved[${ri}]) = ${de.toFixed(1)}, expected ≥10`)
      }
    }
  })

  it('formatTokenBlock emits a valid CSS block with all families', () => {
    const result = solvePalette()
    const block = formatTokenBlock(result)

    // Contains all family keys as token names
    for (const key of FAMILY_KEYS) {
      assert.ok(block.includes(`--kid-${key}:`), `missing --kid-${key} token in output`)
      assert.ok(block.includes(`--kid-on-${key}:`), `missing --kid-on-${key} token in output`)
    }

    // Proper CSS property lines
    const lines = block.split('\n').filter(l => l.startsWith('--kid-'))
    assert.equal(lines.length, FAMILY_KEYS.length * 2,
      `expected ${FAMILY_KEYS.length * 2} token lines, got ${lines.length}`)

    // Token values are valid hex
    for (const line of lines) {
      const match = line.match(/^--kid-\S+:\s*(#[0-9A-Fa-f]{6});$/)
      assert.ok(match, `line "${line}" does not match expected format`)
    }

    // Contains comment block with hue/chroma/tone
    for (const key of FAMILY_KEYS) {
      const info = result[key]
      assert.ok(block.includes(`hue ${info.hue.toFixed(1)}`),
        `missing hue detail for "${key}"`)
      assert.ok(block.includes(`chroma ${info.chroma.toFixed(1)}`),
        `missing chroma detail for "${key}"`)
      assert.ok(block.includes(`tone ${info.tone.toFixed(1)}`),
        `missing tone detail for "${key}"`)
    }
  })
})
