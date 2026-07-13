#!/usr/bin/env node

// DP1: Material Design 3 color-token generator via material-color-utilities
// Usage: node scripts/generate-md3-tokens.mjs --seed <hex> [--chroma <n>] --role <name>
// Harmonizes seed against primary violet (#d0bcff), derives dark-theme tones 80/20/30/90

import { Blend, Hct } from '../frontend/node_modules/@material/material-color-utilities/index.js'

const PRIMARY_SEED = 0xffd0bcff // violet #d0bcff

export function deriveTokens(seedHex, role, optionalChroma = null) {
  // Parse user seed hex (strip # if present)
  const cleanHex = seedHex.startsWith('#') ? seedHex.slice(1) : seedHex
  const seedArgb = 0xff000000 | parseInt(cleanHex, 16)

  // Harmonize user seed toward primary seed
  const harmonizedArgb = Blend.harmonize(seedArgb, PRIMARY_SEED)

  // Extract Hue/Chroma via Hct
  const hct = Hct.fromInt(harmonizedArgb)
  let hue = hct.hue
  let chroma = optionalChroma !== null ? optionalChroma : Math.min(hct.chroma, 40)

  // Dark-theme tones: 80 (light accent), 20 (dark text), 30 (container), 90 (light text)
  const tone80 = Hct.from(hue, chroma, 80).toInt()
  const tone20 = Hct.from(hue, chroma, 20).toInt()
  const tone30 = Hct.from(hue, chroma, 30).toInt()
  const tone90 = Hct.from(hue, chroma, 90).toInt()

  // Convert to hex (drop alpha byte)
  const hexFromInt = (argb) => '#' + (argb & 0xffffff).toString(16).padStart(6, '0').toUpperCase()

  const hex80 = hexFromInt(tone80)
  const hex20 = hexFromInt(tone20)
  const hex30 = hexFromInt(tone30)
  const hex90 = hexFromInt(tone90)

  return {
    role,
    seedHex: cleanHex,
    hue: parseFloat(hue.toFixed(1)),
    chroma: parseFloat(chroma.toFixed(1)),
    tokens: {
      base: hex80,
      onBase: hex20,
      container: hex30,
      onContainer: hex90,
    },
  }
}

// CLI entrypoint
const args = process.argv.slice(2)
const params = {
  seed: null,
  chroma: null,
  role: null,
}

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--seed' && args[i + 1]) {
    params.seed = args[++i]
  } else if (args[i] === '--chroma' && args[i + 1]) {
    params.chroma = parseFloat(args[++i])
  } else if (args[i] === '--role' && args[i + 1]) {
    params.role = args[++i]
  }
}

if (!params.seed || !params.role) {
  console.error('Usage: generate-md3-tokens.mjs --seed <hex> --role <name> [--chroma <n>]')
  process.exit(1)
}

const result = deriveTokens(params.seed, params.role, params.chroma)

// Output ready-to-paste block
console.log(`/* ${result.role} — generated via material-color-utilities from source #${result.seedHex},`)
console.log(`   Blend.harmonize()'d toward primary seed #d0bcff (hue ${result.hue}, chroma ${result.chroma}),`)
console.log(`   tones 80/20/30/90. Regenerate if seed hues change. */`)
console.log(`--md-${result.role}: ${result.tokens.base};`)
console.log(`--md-on-${result.role}: ${result.tokens.onBase};`)
console.log(`--md-${result.role}-container: ${result.tokens.container};`)
console.log(`--md-on-${result.role}-container: ${result.tokens.onContainer};`)
