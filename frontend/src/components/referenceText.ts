import { createElement } from "react";
import { DiceText } from "./DiceText";

export interface LiteralReferenceTextNode {
  type: "text";
  text: string;
  start: number;
  end: number;
}

export interface RegisteredReferenceTextNode {
  type: "reference";
  token: string;
  source: string;
  start: number;
  end: number;
}

export type ReferenceTextNode = LiteralReferenceTextNode | RegisteredReferenceTextNode;

export interface ParsedReferenceText {
  source: string;
  nodes: ReferenceTextNode[];
}

export interface ReferenceTextError {
  kind: "malformed" | "unknown";
  message: string;
  start: number;
  end: number;
  token?: string;
}

export type ReferenceTextValidation =
  { valid: true; document: ParsedReferenceText } | { valid: false; errors: ReferenceTextError[] };

export interface ReferenceDefinition<Context> {
  token: string;
  kind: string;
  domain: string;
  fallback: string;
  resolve: (context: Context) => string | number | null | undefined;
}

export type ReferenceRegistry<Context> = ReadonlyMap<string, ReferenceDefinition<Context>>;

export function createReferenceRegistry<Context>(
  definitions: readonly ReferenceDefinition<Context>[],
): ReferenceRegistry<Context> {
  const registry = new Map<string, ReferenceDefinition<Context>>();
  for (const definition of definitions) {
    if (registry.has(definition.token)) {
      throw new Error(`Duplicate reference token: ${definition.token}`);
    }
    registry.set(definition.token, definition);
  }
  return registry;
}

function findMalformedReferences(source: string): ReferenceTextError[] {
  const errors: ReferenceTextError[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    if (source[cursor] === "}") {
      errors.push({
        kind: "malformed",
        message: "Unmatched closing brace",
        start: cursor,
        end: cursor + 1,
      });
      cursor += 1;
      continue;
    }

    if (source[cursor] !== "{") {
      cursor += 1;
      continue;
    }

    const close = source.indexOf("}", cursor + 1);
    if (close === -1) {
      errors.push({
        kind: "malformed",
        message: "Unmatched opening brace",
        start: cursor,
        end: source.length,
      });
      break;
    }

    const nestedOpen = source.indexOf("{", cursor + 1);
    if (nestedOpen !== -1 && nestedOpen < close) {
      errors.push({
        kind: "malformed",
        message: "Nested braces are not allowed",
        start: cursor,
        end: close + 1,
      });
      cursor = close + 1;
      continue;
    }

    if (source.slice(cursor + 1, close).trim().length === 0) {
      errors.push({
        kind: "malformed",
        message: "Reference token cannot be empty",
        start: cursor,
        end: close + 1,
      });
    }
    cursor = close + 1;
  }

  return errors;
}

export function parseReferenceText(source: string): ReferenceTextValidation {
  const errors = findMalformedReferences(source);
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const nodes: ReferenceTextNode[] = [];
  let cursor = 0;
  let literalStart = 0;

  while (cursor < source.length) {
    if (source[cursor] !== "{") {
      cursor += 1;
      continue;
    }

    if (cursor > literalStart) {
      nodes.push({
        type: "text",
        text: source.slice(literalStart, cursor),
        start: literalStart,
        end: cursor,
      });
    }

    const close = source.indexOf("}", cursor + 1);
    nodes.push({
      type: "reference",
      token: source.slice(cursor + 1, close),
      source: source.slice(cursor, close + 1),
      start: cursor,
      end: close + 1,
    });
    cursor = close + 1;
    literalStart = cursor;
  }

  if (literalStart < source.length) {
    nodes.push({
      type: "text",
      text: source.slice(literalStart),
      start: literalStart,
      end: source.length,
    });
  }

  return { valid: true, document: { source, nodes } };
}

export function validateReferenceText<Context>(
  source: string,
  registry: ReferenceRegistry<Context>,
): ReferenceTextValidation {
  const parsed = parseReferenceText(source);
  if (!parsed.valid) return parsed;

  const errors = parsed.document.nodes
    .filter((node): node is RegisteredReferenceTextNode => node.type === "reference")
    .filter((node) => !registry.has(node.token))
    .map((node): ReferenceTextError => ({
      kind: "unknown",
      message: `Unknown reference token: ${node.token}`,
      token: node.token,
      start: node.start,
      end: node.end,
    }));

  return errors.length > 0 ? { valid: false, errors } : parsed;
}

export function resolveReferenceText<Context>(
  document: ParsedReferenceText,
  registry: ReferenceRegistry<Context>,
  context: Context,
): string {
  return document.nodes
    .map((node) => {
      if (node.type === "text") return node.text;

      const definition = registry.get(node.token);
      if (!definition) return "";
      const value = definition.resolve(context);
      return value === null || value === undefined ? definition.fallback : String(value);
    })
    .join("");
}

export interface ReferenceTextProps<Context> {
  text: string;
  registry: ReferenceRegistry<Context>;
  context: Context;
  invalidFallback?: string;
  role?: string;
}

export const INVALID_REFERENCE_TEXT_FALLBACK = "Reference text unavailable";

export function ReferenceText<Context>({
  text,
  registry,
  context,
  invalidFallback = INVALID_REFERENCE_TEXT_FALLBACK,
  role,
}: ReferenceTextProps<Context>) {
  const result = validateReferenceText(text, registry);
  const resolvedText = result.valid
    ? resolveReferenceText(result.document, registry, context)
    : invalidFallback;

  return createElement(DiceText, { text: resolvedText, role });
}

export interface SpellValueReferenceContext {
  spell_attack_bonus?: number | null;
  spell_save_dc?: number | null;
}

export const spellValueReferenceRegistry = createReferenceRegistry<SpellValueReferenceContext>([
  {
    token: "spell_attack_bonus",
    kind: "value",
    domain: "spell",
    fallback: "your spell attack bonus",
    resolve: (context) => context.spell_attack_bonus,
  },
  {
    token: "spell_save_dc",
    kind: "value",
    domain: "spell",
    fallback: "your spell save DC",
    resolve: (context) => context.spell_save_dc,
  },
]);

export interface WeaponValueReferenceContext {
  weapon_attack_bonus?: number | null;
  weapon_damage_bonus?: number | null;
}

export const weaponValueReferenceRegistry = createReferenceRegistry<WeaponValueReferenceContext>([
  {
    token: "weapon_attack_bonus",
    kind: "value",
    domain: "weapon",
    fallback: "your attack bonus",
    resolve: (context) => context.weapon_attack_bonus,
  },
  {
    token: "weapon_damage_bonus",
    kind: "value",
    domain: "weapon",
    fallback: "your damage bonus",
    resolve: (context) => context.weapon_damage_bonus,
  },
]);
