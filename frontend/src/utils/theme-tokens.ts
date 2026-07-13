// DP1: Token derivation logic (pure, testable)

export interface TokenSet {
  base: string
  onBase: string
  container: string
  onContainer: string
}

export interface DerivedTokens {
  role: string
  seedHex: string
  hue: number
  chroma: number
  tokens: TokenSet
}

// Note: This is a TypeScript stub. The actual MD3 math is in scripts/generate-md3-tokens.mjs
// which uses material-color-utilities. This file provides the type contract for tests
// and future TS consumers. The script handles the real color math via the Node import.

export function deriveTokensStub(
  seedHex: string,
  role: string,
  optionalChroma?: number | null,
): DerivedTokens {
  throw new Error('deriveTokens requires material-color-utilities (Node runtime). Use scripts/generate-md3-tokens.mjs instead.')
}
