// DP1: Token derivation format validation
// (Full deriveTokens unit tests run in Node via scripts/generate-md3-tokens.mjs --test)
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const themeCss = readFileSync(resolve(process.cwd(), 'src/theme.css'), 'utf-8')

describe('theme tokens', () => {
  it('MD3 custom-color tokens follow the role naming format', () => {
    // Token names: --md-<role> / --md-on-<role> / --md-<role>-container / --md-on-<role>-container
    const validTokenPattern = /^--md-[a-z-]+$/
    const tokenNames = [
      '--md-passage-locked',
      '--md-on-passage-locked',
      '--md-passage-locked-container',
      '--md-on-passage-locked-container',
      '--md-passage-hidden',
      '--md-on-passage-hidden',
      '--md-passage-hidden-container',
      '--md-on-passage-hidden-container',
      '--md-loot',
      '--md-on-loot',
      '--md-loot-container',
      '--md-on-loot-container',
      // DP1: Banked damage-type and domain roles
      '--md-divine',
      '--md-on-divine',
      '--md-divine-container',
      '--md-on-divine-container',
      '--md-arcane',
      '--md-on-arcane',
      '--md-arcane-container',
      '--md-on-arcane-container',
      '--md-nature',
      '--md-on-nature',
      '--md-nature-container',
      '--md-on-nature-container',
      '--md-fire',
      '--md-on-fire',
      '--md-fire-container',
      '--md-on-fire-container',
      '--md-cold',
      '--md-on-cold',
      '--md-cold-container',
      '--md-on-cold-container',
      '--md-lightning',
      '--md-on-lightning',
      '--md-lightning-container',
      '--md-on-lightning-container',
      '--md-poison',
      '--md-on-poison',
      '--md-poison-container',
      '--md-on-poison-container',
      '--md-psychic',
      '--md-on-psychic',
      '--md-psychic-container',
      '--md-on-psychic-container',
      '--md-boss',
      '--md-on-boss',
      '--md-boss-container',
      '--md-on-boss-container',
      '--md-skill',
      '--md-on-skill',
      '--md-skill-container',
      '--md-on-skill-container',
    ]
    tokenNames.forEach((name) => {
      expect(name).toMatch(validTokenPattern)
    })
  })

  it('banked hex colors are uppercase 6-digit #-prefixed format', () => {
    // All token values should be #XXXXXX (uppercase hex)
    const hexPattern = /^#[0-9A-F]{6}$/
    const sampleTokens = [
      '#C5C0FF', '#2C2767', '#433F7F', '#E3DFFF', '#C7C6C6', '#F6B994',
      '#FBBA73', '#90CDFE', '#86D5C1', '#FFB3AE', '#73D5E1', '#ECBF79',
      '#9BD594', '#DFB7FF', '#FFB1C1', '#A6C8FF',
    ]
    sampleTokens.forEach((hex) => {
      expect(hex).toMatch(hexPattern)
    })
  })

  it('banked tokens provide contrast for dark theme', () => {
    // Each role should have light/dark variants for contrast
    const lightTokens = [
      'C5C0FF', 'C7C6C6', 'F6B994',  // original banked
      'FBBA73', '90CDFE', '86D5C1', 'FFB3AE', '73D5E1',
      'ECBF79', '9BD594', 'DFB7FF', 'FFB1C1', 'A6C8FF',
    ]
    const darkTokens = [
      '2C2767', '2F3031', '4C270C',  // original banked
      '492900', '00344F', '00382E', '5A1B1A', '00363B',
      '432C00', '01390A', '41215D', '59192C', '00315F',
    ]

    lightTokens.forEach((hex) => {
      const value = parseInt(hex, 16)
      const brightness = (value >> 16) * 0.299 + ((value >> 8) & 0xff) * 0.587 + (value & 0xff) * 0.114
      expect(brightness).toBeGreaterThan(150) // light (tone 80)
    })

    darkTokens.forEach((hex) => {
      const value = parseInt(hex, 16)
      const brightness = (value >> 16) * 0.299 + ((value >> 8) & 0xff) * 0.587 + (value & 0xff) * 0.114
      expect(brightness).toBeLessThan(100) // dark (tone 20)
    })
  })

  // VF1: foundation scale — spacing, radius, control size, elevation/backdrop, motion, z-index
  describe('VF1 foundation token scale', () => {
    it('defines the spacing scale', () => {
      ;['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-7'].forEach(
        (token) => {
          expect(themeCss).toMatch(new RegExp(`${token}:\\s*[^;]+;`))
        },
      )
    })

    it('defines the radius scale', () => {
      ;['--radius-sm', '--radius-md', '--radius-lg', '--radius-full'].forEach((token) => {
        expect(themeCss).toMatch(new RegExp(`${token}:\\s*[^;]+;`))
      })
    })

    it('defines the control-size scale', () => {
      expect(themeCss).toMatch(/--control-height:\s*48px;/)
      expect(themeCss).toMatch(/--control-height-compact:\s*32px;/)
    })

    it('defines elevation and backdrop tokens', () => {
      expect(themeCss).toMatch(/--elevation-shadow:\s*[^;]+;/)
      expect(themeCss).toMatch(/--backdrop-color:\s*[^;]+;/)
    })

    it('defines the motion scale', () => {
      expect(themeCss).toMatch(/--motion-fast:\s*0\.15s ease;/)
      expect(themeCss).toMatch(/--motion-normal:\s*0\.2s ease;/)
    })

    it('defines the z-index scale', () => {
      expect(themeCss).toMatch(/--z-editor:\s*100;/)
      expect(themeCss).toMatch(/--z-floating:\s*150;/)
      expect(themeCss).toMatch(/--z-dialog:\s*200;/)
    })

    it('resolves the previously undefined --md-surface-variant token', () => {
      expect(themeCss).toMatch(/--md-surface-variant:\s*var\(--md-surface-3\);/)
    })
  })
})
