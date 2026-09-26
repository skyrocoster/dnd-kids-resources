import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode } from "react";
import { useArgs } from "storybook/preview-api";
import { MonsterAbilityScoresCandidate } from "./MonsterAbilityScoresCandidate";
import { MonsterDetailRegionsCandidate } from "./MonsterDetailRegionsCandidate";
import { MonsterIdentityCandidate } from "./MonsterIdentityCandidate";
import { MonsterProficienciesCandidate } from "./MonsterProficienciesCandidate";
import { MonsterVitalsCandidate } from "./MonsterVitalsCandidate";
import "./monsterCompositionCandidates.css";

const meta = {
  title: "In Development/Application/Monsters/Stat Block Compositions",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Five isolated visual candidates based on the focused HTML references. All Young Red Dragon text and values shown here are illustrative mock content, not canonical data. Known differences: the mock Dexterity save is +5 (the seed is +4); mock speed omits climb 40 ft.; mock senses omit blindsight 30 ft.; Bite is simplified prose rather than the structured seed attack; and Fire Breath is shown in Lore although the seed classifies it as an action. These stories do not claim a complete stat block or establish NPC/player fields.",
      },
    },
  },
} satisfies Meta;

export default meta;

function CandidatePreview({ children }: { children: ReactNode }) {
  return <div className="monster-candidate-preview">{children}</div>;
}

interface IdentityArgs {
  category: string;
  name: string;
  descriptor: string;
  challengeRating: string;
}

export const Identity: StoryObj<IdentityArgs> = {
  name: "Identity",
  args: {
    category: "Dragon",
    name: "Young Red Dragon",
    descriptor: "large, dragon, chaotic evil",
    challengeRating: "10",
  },
  argTypes: {
    category: { control: "text" },
    name: { control: "text" },
    descriptor: { control: "text" },
    challengeRating: { control: "text", description: "Clear this value to hide the CR badge." },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Illustrative monster identity from identity.html. CR is optional in the candidate props and is not presented as a universal field.",
      },
    },
  },
  render: ({ category, name, descriptor, challengeRating }) => (
    <CandidatePreview>
      <MonsterIdentityCandidate
        category={category}
        name={name}
        descriptor={descriptor}
        challengeRating={challengeRating}
      />
    </CandidatePreview>
  ),
};

interface VitalsArgs {
  armorClassValue: number;
  armorClassNote: string;
  hitPointsAverage: number;
  hitPointsFormula: string;
  speed: string;
}

export const Vitals: StoryObj<VitalsArgs> = {
  name: "Vitals",
  args: {
    armorClassValue: 18,
    armorClassNote: "natural armor",
    hitPointsAverage: 178,
    hitPointsFormula: "17d10 + 85",
    speed: "40 ft., fly 80 ft.",
  },
  argTypes: {
    armorClassValue: {
      control: { type: "number", min: 0, step: 1 },
      name: "Armor class value",
    },
    armorClassNote: {
      control: "text",
      name: "Armor class note",
      description: "Clear to omit the note.",
    },
    hitPointsAverage: {
      control: { type: "number", min: 0, step: 1 },
      name: "Hit point average",
    },
    hitPointsFormula: {
      control: "text",
      name: "Hit point formula",
      description: "Clear to omit the formula.",
    },
    speed: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Illustrative values from vitals.html, not canonical seed data. The reference speed omits the seed record's climb 40 ft. entry.",
      },
    },
  },
  render: ({ armorClassValue, armorClassNote, hitPointsAverage, hitPointsFormula, speed }) => (
    <CandidatePreview>
      <MonsterVitalsCandidate
        armorClass={{ value: String(armorClassValue), note: armorClassNote }}
        hitPoints={{ average: String(hitPointsAverage), formula: hitPointsFormula }}
        speed={speed}
      />
    </CandidatePreview>
  ),
};

interface AbilityScoresArgs {
  abilities: { key: string; score: number; modifier: string }[];
}

export const AbilityScores: StoryObj<AbilityScoresArgs> = {
  name: "Ability Scores",
  args: {
    abilities: [
      { key: "STR", score: 23, modifier: "+6" },
      { key: "DEX", score: 10, modifier: "+0" },
      { key: "CON", score: 21, modifier: "+5" },
      { key: "INT", score: 14, modifier: "+2" },
      { key: "WIS", score: 11, modifier: "+0" },
      { key: "CHA", score: 19, modifier: "+4" },
    ],
  },
  argTypes: {
    abilities: {
      control: "object",
      description: "Edit the ability list as objects with key, score, and modifier fields.",
    },
  },
  render: ({ abilities }) => (
    <CandidatePreview>
      <MonsterAbilityScoresCandidate abilities={abilities} />
    </CandidatePreview>
  ),
};

interface ProficienciesArgs {
  savingThrows: string;
  skills: string;
}

export const Proficiencies: StoryObj<ProficienciesArgs> = {
  name: "Proficiencies",
  args: {
    savingThrows: "Dex +5, Con +9, Wis +4, Cha +8",
    skills: "Perception +8, Stealth +4",
  },
  argTypes: {
    savingThrows: { control: "text" },
    skills: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Illustrative values from proficiencies.html, not canonical seed data. The mock Dexterity saving throw is +5; the seed record is +4. Saving throws and skills remain separate props and headings.",
      },
    },
  },
  render: ({ savingThrows, skills }) => (
    <CandidatePreview>
      <MonsterProficienciesCandidate savingThrows={savingThrows} skills={skills} />
    </CandidatePreview>
  ),
};

interface DetailRegionStoryPanel {
  title: string;
  subtitle: string;
  text: string;
}

interface DetailRegionsArgs {
  panels: DetailRegionStoryPanel[];
  panelCount: number;
}

export const DetailRegions: StoryObj<DetailRegionsArgs> = {
  name: "Detail Regions",
  args: {
    panelCount: 3,
    panels: [
      {
        title: "Actions",
        subtitle: "Attacks & Actions",
        text: "**Bite:** Melee Weapon Attack.",
      },
      {
        title: "Defenses",
        subtitle: "Senses",
        text: "darkvision 120 ft., passive Perception 18",
      },
      {
        title: "Lore",
        subtitle: "Traits and languages",
        text: "**Fire Breath:** The dragon exhales fire in a cone.\n**Languages** Common, Draconic",
      },
    ],
  },
  argTypes: {
    panelCount: {
      control: { type: "range", min: 0, max: 12, step: 1 },
      description: "Number of visible regions. The preview buttons update this control too.",
    },
    panels: {
      control: "object",
      description:
        "Edit regions as an array of objects with title, subtitle, and text fields. Text supports leading **emphasis** and line breaks.",
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Use the Storybook Controls panel to edit each region's title, subtitle, and text. Use Add region and Remove region in the preview to adjust the number of boxes from zero to twelve. The first three are the illustrative source arrangement: the mock places simplified Fire Breath text in Lore (the seed record classifies Fire Breath as an action), uses incomplete Bite prose, and omits blindsight from the senses example. Every panel's title, subtitle, and text are supplied by this story, not defined as universal section types.",
      },
    },
  },
  render: ({ panels, panelCount }) => {
    const [, updateArgs] = useArgs<DetailRegionsArgs>();

    return (
      <DetailRegionsPlayground
        panels={panels}
        panelCount={panelCount}
        onPanelCountChange={(count) => updateArgs({ panelCount: count })}
      />
    );
  },
};

const maxDetailRegionCount = 12;

function getDetailRegionText(text: string): ReactNode {
  return text.split("\n").map((line, index) => {
    const emphasizedLabel = /^\*\*(.+?)\*\*(.*)$/.exec(line);

    return (
      <p key={index}>
        {emphasizedLabel ? (
          <>
            <strong>{emphasizedLabel[1]}</strong>
            {emphasizedLabel[2]}
          </>
        ) : (
          line
        )}
      </p>
    );
  });
}

function getDetailRegionPanels(
  panelCount: number,
  storyPanels: readonly DetailRegionStoryPanel[],
) {
  return Array.from({ length: panelCount }, (_, index) => {
    const storyPanel = storyPanels[index];
    if (storyPanel) return { ...storyPanel, text: getDetailRegionText(storyPanel.text) };

    const regionNumber = index + 1;
    return {
      title: `Extra Region ${regionNumber}`,
      subtitle: "Custom section",
      text: <p>Example text for region {regionNumber}.</p>,
    };
  });
}

function DetailRegionsPlayground({
  panels,
  panelCount,
  onPanelCountChange,
}: {
  panels: readonly DetailRegionStoryPanel[];
  panelCount: number;
  onPanelCountChange: (count: number) => void;
}) {
  return (
    <CandidatePreview>
      <div
        className="monster-detail-regions-playground-controls"
        role="group"
        aria-label="Adjust region count"
      >
        <button
          type="button"
          onClick={() => onPanelCountChange(Math.max(0, panelCount - 1))}
          disabled={panelCount === 0}
        >
          Remove region
        </button>
        <output aria-live="polite">
          {panelCount} {panelCount === 1 ? "region" : "regions"}
        </output>
        <button
          type="button"
          onClick={() => onPanelCountChange(Math.min(maxDetailRegionCount, panelCount + 1))}
          disabled={panelCount === maxDetailRegionCount}
        >
          Add region
        </button>
      </div>
      <MonsterDetailRegionsCandidate panels={getDetailRegionPanels(panelCount, panels)} />
    </CandidatePreview>
  );
}
