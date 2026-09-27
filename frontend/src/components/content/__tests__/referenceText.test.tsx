import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiceText } from "../DiceText";
import {
  parseReferenceText,
  ReferenceText,
  resolveReferenceText,
  spellValueReferenceRegistry,
  validateReferenceText,
  type SpellValueReferenceContext,
} from "../referenceText";

function resolve(text: string, context: SpellValueReferenceContext): string {
  const result = validateReferenceText(text, spellValueReferenceRegistry);
  if (!result.valid) throw new Error("Expected valid reference text");
  return resolveReferenceText(result.document, spellValueReferenceRegistry, context);
}

describe("reference text", () => {
  it("parses literal-only and mixed text into ordered nodes", () => {
    const literal = parseReferenceText("Deal 1d6 damage.");
    expect(literal).toEqual({
      valid: true,
      document: {
        source: "Deal 1d6 damage.",
        nodes: [{ type: "text", text: "Deal 1d6 damage.", start: 0, end: 16 }],
      },
    });

    const mixed = parseReferenceText("Roll {spell_attack_bonus} now");
    expect(mixed.valid && mixed.document.nodes).toEqual([
      { type: "text", text: "Roll ", start: 0, end: 5 },
      {
        type: "reference",
        token: "spell_attack_bonus",
        source: "{spell_attack_bonus}",
        start: 5,
        end: 25,
      },
      { type: "text", text: " now", start: 25, end: 29 },
    ]);
  });

  it("resolves both registered spell values without calculating them", () => {
    expect(
      resolve("Attack +{spell_attack_bonus}; save DC {spell_save_dc}.", {
        spell_attack_bonus: 7,
        spell_save_dc: 15,
      }),
    ).toBe("Attack +7; save DC 15.");
  });

  it("treats zero as supplied context", () => {
    expect(resolve("{spell_attack_bonus}", { spell_attack_bonus: 0 })).toBe("0");
  });

  it("uses readable fallbacks when context is unavailable", () => {
    expect(resolve("{spell_attack_bonus}; {spell_save_dc}", {})).toBe(
      "your spell attack bonus; your spell save DC",
    );
  });

  it("resolves repeated tokens and preserves surrounding text byte-for-byte", () => {
    expect(
      resolve("  +{spell_attack_bonus} / +{spell_attack_bonus}\n", { spell_attack_bonus: 4 }),
    ).toBe("  +4 / +4\n");
  });

  it.each([
    ["open {spell_attack_bonus", 5, 24],
    ["close }", 6, 7],
    ["nested {spell_{attack_bonus}}", 7, 28],
    ["empty {}", 6, 8],
    ["blank {   }", 6, 11],
  ])("rejects malformed braces in %s", (source, start, end) => {
    const result = validateReferenceText(source, spellValueReferenceRegistry);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors[0]).toMatchObject({ kind: "malformed", start, end });
  });

  it("rejects unknown complete tokens with their name and position", () => {
    const result = validateReferenceText("Use {weapon_bonus}.", spellValueReferenceRegistry);
    expect(result).toEqual({
      valid: false,
      errors: [
        {
          kind: "unknown",
          message: "Unknown reference token: weapon_bonus",
          token: "weapon_bonus",
          start: 4,
          end: 18,
        },
      ],
    });
  });

  it("reports multiple authored errors in source order", () => {
    const result = validateReferenceText(
      "{first_unknown} then {second_unknown}",
      spellValueReferenceRegistry,
    );
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.map((error) => [error.token, error.start])).toEqual([
      ["first_unknown", 0],
      ["second_unknown", 21],
    ]);
  });

  it("renders registered reference text with resolved numeric context", () => {
    const { container } = render(
      <ReferenceText
        text="Attack +{spell_attack_bonus}; save DC {spell_save_dc}."
        registry={spellValueReferenceRegistry}
        context={{ spell_attack_bonus: 7, spell_save_dc: 15 }}
      />,
    );

    expect(container).toHaveTextContent("Attack +7; save DC 15.");
  });

  it("renders registered reference text with fallback wording when context is missing", () => {
    const { container } = render(
      <ReferenceText
        text="Attack +{spell_attack_bonus}; save DC {spell_save_dc}."
        registry={spellValueReferenceRegistry}
        context={{}}
      />,
    );

    expect(container).toHaveTextContent(
      "Attack +your spell attack bonus; save DC your spell save DC.",
    );
  });

  it("renders dice pills after resolving reference text", () => {
    const { container } = render(
      <ReferenceText
        text="Roll 1d20 + {spell_attack_bonus}."
        registry={spellValueReferenceRegistry}
        context={{ spell_attack_bonus: 6 }}
      />,
    );

    expect(container.querySelector(".dice-pill")).toHaveTextContent("1d20");
    expect(container).toHaveTextContent("Roll 1d20+6.");
  });

  it("renders invalid reference text as a readable fallback without raw braces", () => {
    const { container } = render(
      <ReferenceText
        text="Attack with {unknown_bonus}."
        registry={spellValueReferenceRegistry}
        context={{ spell_attack_bonus: 6 }}
      />,
    );

    expect(container).toHaveTextContent("Reference text unavailable");
    expect(container.textContent).not.toContain("{");
    expect(container.textContent).not.toContain("}");
  });
  it("composes resolved reference text with DiceText", () => {
    const text = resolve("Roll 1d20 + {spell_attack_bonus}.", { spell_attack_bonus: 6 });
    const { container } = render(<DiceText text={text} />);

    expect(container.querySelector(".dice-pill")).toHaveTextContent("1d20");
    expect(container).toHaveTextContent("Roll 1d20+6.");
    expect(container.textContent).not.toContain("{");
  });
});
