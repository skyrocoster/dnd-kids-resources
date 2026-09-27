import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatBlockAbilityScores } from "../StatBlockAbilityScores";
import { StatBlockIdentity } from "../StatBlockIdentity";
import { StatBlockProficiencies } from "../StatBlockProficiencies";
import { StatBlockVitals } from "../StatBlockVitals";

describe("stat-block primitives", () => {
  it("renders generic identity content and optional accessory", () => {
    render(
      <StatBlockIdentity
        eyebrow="Human · Paladin"
        name="Mira Stonebrook"
        description="Oath of the Ancients"
        accessory={<span>Level 5</span>}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Mira Stonebrook" })).toBeInTheDocument();
    expect(screen.getByText("Human · Paladin")).toBeInTheDocument();
    expect(screen.getByText("Oath of the Ancients")).toBeInTheDocument();
    expect(screen.getByText("Level 5")).toBeInTheDocument();
  });

  it("renders a configurable list of vital values", () => {
    render(
      <StatBlockVitals
        ariaLabel="Character statistics"
        items={[
          { label: "Armor Class", value: "18" },
          { label: "Hit Points", value: "52", emphasis: true },
          { label: "Speed", value: "30 ft." },
          { label: "Initiative", value: "+3" },
        ]}
      />,
    );

    const statistics = screen.getByLabelText("Character statistics");
    expect(within(statistics).getAllByRole("term")).toHaveLength(4);
    expect(within(statistics).getByText("Initiative")).toBeInTheDocument();
    expect(within(statistics).getByText("52")).toBeInTheDocument();
  });

  it("renders ability scores and arbitrary proficiency groups", () => {
    render(
      <>
        <StatBlockAbilityScores
          abilities={[{ key: "STR", score: 16, modifier: "+3" }, { key: "CHA", score: 18, modifier: "+4" }]}
        />
        <StatBlockProficiencies
          items={[
            { label: "Skills", value: "Insight +5, Persuasion +7" },
            { label: "Tools", value: "Herbalism kit" },
          ]}
        />
      </>,
    );

    expect(screen.getByText("STR")).toBeInTheDocument();
    expect(screen.getByText("+4")).toBeInTheDocument();
    expect(screen.getByText("Tools")).toBeInTheDocument();
    expect(screen.getByText("Herbalism kit")).toBeInTheDocument();
  });

  it("renders no empty grids or lists", () => {
    const { container } = render(
      <>
        <StatBlockVitals items={[]} />
        <StatBlockAbilityScores abilities={[]} />
        <StatBlockProficiencies items={[]} />
      </>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
