import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonsterDetailRegionsCandidate } from "../MonsterDetailRegionsCandidate";

describe("MonsterDetailRegionsCandidate", () => {
  it("renders any number of regions in the supplied order with their title, subtitle, and text", () => {
    render(
      <MonsterDetailRegionsCandidate
        panels={[
          { title: "Lore", subtitle: "World notes", text: "An ancient guardian." },
          { title: "Actions", subtitle: "In a fight", text: "Claw and tail attacks." },
          { title: "Defenses", subtitle: "Resistances", text: "Fire resistance." },
          { title: "Habitat", subtitle: "Where it lives", text: "Volcanic caves." },
        ]}
      />,
    );

    const regions = screen.getAllByRole("region");
    expect(regions).toHaveLength(4);
    expect(
      regions.map((region) => within(region).getByRole("heading", { level: 2 }).textContent),
    ).toEqual(["Lore", "Actions", "Defenses", "Habitat"]);

    for (const [region, subtitle, text] of [
      [regions[0], "World notes", "An ancient guardian."],
      [regions[1], "In a fight", "Claw and tail attacks."],
      [regions[2], "Resistances", "Fire resistance."],
      [regions[3], "Where it lives", "Volcanic caves."],
    ] as const) {
      expect(within(region).getByRole("heading", { level: 3 })).toHaveTextContent(subtitle);
      expect(within(region).getByText(text)).toBeInTheDocument();
    }
  });
});
