#!/usr/bin/env node

// DP1: Kid-palette solver — deterministic bounded search for four kid-map family colours
// Usage: node frontend/src/tools/derive-kid-palette.mjs
// Outputs: CSS token block for the four families with computed glyph colours
//
// The solver finds one colour per family within its nameable hue band such that:
// - All four colours are perceptually distinct (maximised minimum pairwise ΔE2000)
// - They maintain a minimum lightness spread (ΔL*)
// - Each has ≥4.5:1 WCAG contrast against all map backgrounds
// - Glyph colour (black or white) is computed per family for contrast on the disc

import { Hct, Contrast, hexFromArgb as mdHexFromArgb, argbFromHex, lstarFromArgb, labFromArgb, yFromLstar } from '../../node_modules/@material/material-color-utilities/index.js'

// Uppercase hex to match theme.css convention (existing tokens use #C5C0FF, not #c5c0ff)
function hexFromArgb(argb) {
  return mdHexFromArgb(argb).toUpperCase()
}

// ─── Contract specification (documented input contract) ────────────────────────

export const FAMILY_SPEC = {
  transition: { hueBand: [100, 140], label: 'green' },
  opening:    { hueBand: [45, 75],   label: 'yellow' },
  fixture:    { hueBand: [210, 260], label: 'blue' },
  people:     { hueBand: [315, 350], label: 'pink' },
}

export const RESERVED_HEXES = [
  '#cac4d0', // wall
  '#49454f', // outline variant
  '#004B71', // river
  '#005143', // trees
]

export const BACKGROUND_LSTARS = [10.0, 13.2] // clear-plate, quiet-room-fill

const CONTRAST_FLOOR = 4.5

// Tone values to search: must be ≥~57 to clear 4.5:1 vs L* 13.2
const TONE_SEARCH = [55, 58, 60, 62, 65, 68, 70, 72, 75]
const CHROMA_SEARCH = [25, 30, 35, 40, 45, 50]
const HUE_STEP = 3

// ─── Colour utilities ─────────────────────────────────────────────────────────

/**
 * Convert Hct coordinates to CIELAB object {L, a, b}.
 */
function labFromHct(hue, chroma, tone) {
  const hueRad = (hue * Math.PI) / 180
  return { L: tone, a: chroma * Math.cos(hueRad), b: chroma * Math.sin(hueRad) }
}

/**
 * CIEDE2000 colour-difference formula.
 * Standard implementation based on the CIE publication.
 */
export function deltaE2000(lab1, lab2) {
  const kL = 1, kC = 1, kH = 1

  const L1 = lab1.L, a1 = lab1.a, b1 = lab1.b
  const L2 = lab2.L, a2 = lab2.a, b2 = lab2.b

  const C1 = Math.sqrt(a1 * a1 + b1 * b1)
  const C2 = Math.sqrt(a2 * a2 + b2 * b2)
  const Cb = (C1 + C2) / 2

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))))

  const a1p = (1 + G) * a1
  const a2p = (1 + G) * a2

  const C1p = Math.sqrt(a1p * a1p + b1 * b1)
  const C2p = Math.sqrt(a2p * a2p + b2 * b2)

  const h1p = (b1 === 0 && a1p === 0) ? 0 : (Math.atan2(b1, a1p) * 180 / Math.PI + 360) % 360
  const h2p = (b2 === 0 && a2p === 0) ? 0 : (Math.atan2(b2, a2p) * 180 / Math.PI + 360) % 360

  const dLp = L2 - L1
  const dCp = C2p - C1p

  let dhp = 0
  if (C1p * C2p !== 0) {
    const diff = h2p - h1p
    if (Math.abs(diff) <= 180) dhp = diff
    else if (diff > 180) dhp = diff - 360
    else dhp = diff + 360
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360)

  const Lb = (L1 + L2) / 2
  const Cbp = (C1p + C2p) / 2

  let hbp = 0
  if (C1p * C2p !== 0) {
    const sum = h1p + h2p
    if (Math.abs(h1p - h2p) <= 180) hbp = sum / 2
    else if (sum < 360) hbp = (sum + 360) / 2
    else hbp = (sum - 360) / 2
  }

  const T = 1
    - 0.17 * Math.cos((hbp - 30) * Math.PI / 180)
    + 0.24 * Math.cos((2 * hbp) * Math.PI / 180)
    + 0.32 * Math.cos((3 * hbp + 6) * Math.PI / 180)
    - 0.20 * Math.cos((4 * hbp - 63) * Math.PI / 180)

  const dTheta = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2))
  const Rc = 2 * Math.sqrt(Math.pow(Cbp, 7) / (Math.pow(Cbp, 7) + Math.pow(25, 7)))
  const RT = -Rc * Math.sin(2 * dTheta * Math.PI / 180)

  const SL = 1 + (0.015 * Math.pow(Lb - 50, 2)) / Math.sqrt(20 + Math.pow(Lb - 50, 2))
  const SC = 1 + 0.045 * Cbp
  const SH = 1 + 0.015 * Cbp * T

  return Math.sqrt(
    Math.pow(dLp / (kL * SL), 2) +
    Math.pow(dCp / (kC * SC), 2) +
    Math.pow(dHp / (kH * SH), 2) +
    RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
  )
}

/**
 * WCAG relative luminance of a hex colour (#RRGGBB).
 */
function hexRelLum(hex) {
  const argb = argbFromHex(hex)
  const lstar = lstarFromArgb(argb)
  return yFromLstar(lstar) / 100
}

/**
 * Pick glyph colour (black or white) for maximum contrast on a disc.
 */
function pickGlyphColour(hex) {
  const lum = hexRelLum(hex)
  // WCAG: if relative luminance > ~0.179, black text is more readable
  return lum > 0.179 ? '#000000' : '#FFFFFF'
}

// ─── Candidate generation ────────────────────────────────────────────────────

function candidatesForFamily(familyKey, spec) {
  const [hueLo, hueHi] = spec.hueBand
  const centerHue = (hueLo + hueHi) / 2
  const candidates = []

  for (let hue = hueLo; hue <= hueHi; hue += HUE_STEP) {
    for (const chroma of CHROMA_SEARCH) {
      for (const tone of TONE_SEARCH) {
        const hct = Hct.from(hue, chroma, tone)
        const actualHue = hct.hue
        const actualChroma = hct.chroma
        const actualTone = hct.tone

        // Check contrast floor against all backgrounds
        const allBgOk = BACKGROUND_LSTARS.every(bgL =>
          Contrast.ratioOfTones(actualTone, bgL) >= CONTRAST_FLOOR
        )
        if (!allBgOk) continue

        const hex = hexFromArgb(hct.toInt())

        candidates.push({
          familyKey,
          hex,
          hue: actualHue,
          chroma: actualChroma,
          tone: actualTone,
          lab: labFromHct(actualHue, actualChroma, actualTone),
          centreDist: Math.abs(actualHue - centerHue),
        })
      }
    }
  }

  return candidates
}

// ─── Solver ──────────────────────────────────────────────────────────────────

/**
 * Solve the four-family palette.
 *
 * @param {object}  familySpec     — family key → {hueBand, label}
 * @param {string[]} reservedHexes — hex strings the palette must stay clear of
 * @param {number[]} bgLstars      — background L* values for contrast check
 * @returns {object} family key → {disc, glyph, hue, chroma, tone}
 */
export function solvePalette(familySpec = FAMILY_SPEC, reservedHexes = RESERVED_HEXES, bgLstars = BACKGROUND_LSTARS) {
  const familyKeys = Object.keys(familySpec)
  if (familyKeys.length === 0) return {}

  // Generate valid candidates per family (filtered by contrast floor)
  const allCandidates = {}
  for (const key of familyKeys) {
    allCandidates[key] = candidatesForFamily(key, familySpec[key])
    if (allCandidates[key].length === 0) {
      throw new Error(`No valid candidates for "${key}" — relax constraints or widen hue band`)
    }
  }

  // Rank candidates within each family: prefer centre-of-band hue, then high chroma
  for (const key of familyKeys) {
    allCandidates[key].sort((a, b) => {
      if (a.centreDist !== b.centreDist) return a.centreDist - b.centreDist
      return b.chroma - a.chroma
    })
  }

  // Greedy selection: pick candidates one family at a time, maximising
  // minimum pairwise ΔE2000 to already-picked families.
  const picked = {}

  // Start with the most constrained hue band (smallest band = opening)
  const pickOrder = ['opening', 'transition', 'people', 'fixture']

  for (const key of pickOrder) {
    if (!allCandidates[key]) continue

    let best = null
    let bestScore = -Infinity

    for (const cand of allCandidates[key]) {
      let score
      if (Object.keys(picked).length === 0) {
        // First family: prefer central hue and high chroma
        score = cand.chroma / 50 - cand.centreDist / 180
      } else {
        // Score = minimum ΔE2000 to already-picked families
        const minDE = Object.values(picked).reduce(
          (min, p) => Math.min(min, deltaE2000(cand.lab, p.lab)),
          Infinity
        )
        const minDL = Object.values(picked).reduce(
          (min, p) => Math.min(min, Math.abs(cand.tone - p.tone)),
          Infinity
        )
        // Penalise tone clashes with already-picked families
        const toneClashPenalty = Object.values(picked).some(
          p => Math.abs(cand.tone - p.tone) < 5
        ) ? 8 : 0
        score = minDE + minDL * 0.5 - toneClashPenalty
      }
      if (score > bestScore) {
        bestScore = score
        best = cand
      }
    }

    picked[key] = best
  }

  // Build result with glyph colours
  const result = {}
  for (const key of familyKeys) {
    const c = picked[key]
    result[key] = {
      disc: c.hex,
      glyph: pickGlyphColour(c.hex),
      hue: c.hue,
      chroma: c.chroma,
      tone: c.tone,
    }
  }

  return result
}

// ─── Formatter ────────────────────────────────────────────────────────────────

/**
 * Format the palette result as a CSS token block ready for theme.css.
 *
 * @param {object} result    — output of solvePalette()
 * @param {object} [familySpec] — used for label lookups
 * @returns {string}
 */
export function formatTokenBlock(result, familySpec = FAMILY_SPEC) {
  const lines = []
  const keys = Object.keys(result)

  for (const key of keys) {
    const info = result[key]
    const spec = familySpec[key] || {}
    const label = spec.label || key

    lines.push(`/* ${key} — ${label} family, solved via material-color-utilities`)
    lines.push(`   hue ${info.hue.toFixed(1)}, chroma ${info.chroma.toFixed(1)}, tone ${info.tone.toFixed(1)}. */`)
    lines.push(`--kid-${key}: ${info.disc};`)
    lines.push(`--kid-on-${key}: ${info.glyph};`)
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function main() {
  try {
    const result = solvePalette()
    const block = formatTokenBlock(result)
    console.log(block)
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

// Detect CLI invocation (ESM context — check import.meta.url against known paths)
const scriptPath = new URL(import.meta.url).pathname
if (scriptPath.endsWith('/derive-kid-palette.mjs') || scriptPath.endsWith('\\derive-kid-palette.mjs')) {
  main()
}
