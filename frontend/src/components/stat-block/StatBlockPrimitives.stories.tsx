import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode } from "react";
import { StatBlockAbilityScores } from "./StatBlockAbilityScores";
import { StatBlockIdentity } from "./StatBlockIdentity";
import { StatBlockProficiencies } from "./StatBlockProficiencies";
import { StatBlockVitals } from "./StatBlockVitals";

const meta = {
  title: "Production/Design System/Stat Block",
  tags: ["status-production"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Four reusable, data-agnostic stat-block building blocks. The examples can be composed for monsters, NPCs, player characters, or other records with compatible data.",
      },
    },
  },
} satisfies Meta;

export default meta;

function StatBlockPreview({ children }: { children: ReactNode }) {
  return (
    <div className="stat-block-demo">
      <div className="stat-block-demo__card">{children}</div>
    </div>
  );
}

interface IdentityArgs {
  eyebrow: string;
  name: string;
  description: string;
  accessory: string;
}

export const Identity: StoryObj<IdentityArgs> = {
  name: "Identity",
  args: {
    eyebrow: "Human · Paladin",
    name: "Mira Stonebrook",
    description: "Oath of the Ancients",
    accessory: "Level 5",
  },
  argTypes: {
    eyebrow: { control: "text", description: "Optional context above the name." },
    name: { control: "text" },
    description: { control: "text" },
    accessory: { control: "text", description: "Optional badge or other trailing content." },
  },
  render: ({ eyebrow, name, description, accessory }) => (
    <StatBlockPreview>
      <StatBlockIdentity
        eyebrow={eyebrow}
        name={name}
        description={description}
        accessory={accessory ? <span className="stat-block-demo__badge">{accessory}</span> : null}
      />
    </StatBlockPreview>
  ),
};

interface VitalArgs {
  items: { label: string; value: string; emphasis?: boolean }[];
}

export const Vitals: StoryObj<VitalArgs> = {
  name: "Vitals",
  args: {
    items: [
      { label: "AC", value: "18" },
      { label: "HP", value: "52 (8d8 + 16)", emphasis: true },
      { label: "Speed", value: "30 ft." },
    ],
  },
  argTypes: {
    items: {
      control: "object",
      description: "Any labeled values; no game-specific fields are built in.",
    },
  },
  render: ({ items }) => (
    <StatBlockPreview>
      <StatBlockVitals items={items} />
    </StatBlockPreview>
  ),
};

interface AbilityScoresArgs {
  abilities: { key: string; score: number; modifier: string }[];
}

export const AbilityScores: StoryObj<AbilityScoresArgs> = {
  name: "Ability scores",
  args: {
    abilities: [
      { key: "STR", score: 16, modifier: "+3" },
      { key: "DEX", score: 12, modifier: "+1" },
      { key: "CON", score: 14, modifier: "+2" },
      { key: "INT", score: 10, modifier: "+0" },
      { key: "WIS", score: 13, modifier: "+1" },
      { key: "CHA", score: 18, modifier: "+4" },
    ],
  },
  argTypes: {
    abilities: {
      control: "object",
      description: "A list of scores with optional display modifiers.",
    },
  },
  render: ({ abilities }) => (
    <StatBlockPreview>
      <h2 className="stat-block-demo__section-title">Ability scores</h2>
      <StatBlockAbilityScores abilities={abilities} />
    </StatBlockPreview>
  ),
};

interface ProficienciesArgs {
  items: { label: string; value: string }[];
}

export const Proficiencies: StoryObj<ProficienciesArgs> = {
  name: "Proficiencies",
  args: {
    items: [
      { label: "Saving throws", value: "Wis +5, Cha +7" },
      { label: "Skills", value: "Insight +5, Persuasion +7" },
    ],
  },
  argTypes: {
    items: { control: "object", description: "Any labeled proficiency groups." },
  },
  render: ({ items }) => (
    <StatBlockPreview>
      <StatBlockProficiencies items={items} />
    </StatBlockPreview>
  ),
};
