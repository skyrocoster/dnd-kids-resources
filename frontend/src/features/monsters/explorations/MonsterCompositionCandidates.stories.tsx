import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
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
type Story = StoryObj<typeof meta>;

function CandidatePreview({ children }: { children: ReactNode }) {
  return <div className="monster-candidate-preview">{children}</div>;
}

export const Identity: Story = {
  name: "Identity",
  parameters: {
    docs: {
      description: {
        story:
          "Illustrative monster identity from identity.html. CR is optional in the candidate props and is not presented as a universal field.",
      },
    },
  },
  render: () => (
    <CandidatePreview>
      <MonsterIdentityCandidate
        category="Dragon"
        name="Young Red Dragon"
        descriptor="large, dragon, chaotic evil"
        challengeRating="10"
      />
    </CandidatePreview>
  ),
};

export const Vitals: Story = {
  name: "Vitals",
  parameters: {
    docs: {
      description: {
        story:
          "Illustrative values from vitals.html, not canonical seed data. The reference speed omits the seed record's climb 40 ft. entry.",
      },
    },
  },
  render: () => (
    <CandidatePreview>
      <MonsterVitalsCandidate
        armorClass={{ value: "18", note: "natural armor" }}
        hitPoints={{ average: "178", formula: "17d10 + 85" }}
        speed="40 ft., fly 80 ft."
      />
    </CandidatePreview>
  ),
};

export const AbilityScores: Story = {
  name: "Ability Scores",
  render: () => (
    <CandidatePreview>
      <MonsterAbilityScoresCandidate
        abilities={[
          { key: "STR", score: 23, modifier: "+6" },
          { key: "DEX", score: 10, modifier: "+0" },
          { key: "CON", score: 21, modifier: "+5" },
          { key: "INT", score: 14, modifier: "+2" },
          { key: "WIS", score: 11, modifier: "+0" },
          { key: "CHA", score: 19, modifier: "+4" },
        ]}
      />
    </CandidatePreview>
  ),
};

export const Proficiencies: Story = {
  name: "Proficiencies",
  parameters: {
    docs: {
      description: {
        story:
          "Illustrative values from proficiencies.html, not canonical seed data. The mock Dexterity saving throw is +5; the seed record is +4. Saving throws and skills remain separate props and headings.",
      },
    },
  },
  render: () => (
    <CandidatePreview>
      <MonsterProficienciesCandidate
        savingThrows="Dex +5, Con +9, Wis +4, Cha +8"
        skills="Perception +8, Stealth +4"
      />
    </CandidatePreview>
  ),
};

export const DetailRegions: Story = {
  name: "Detail Regions",
  parameters: {
    docs: {
      description: {
        story:
          "Illustrative source arrangement only. The mock places simplified Fire Breath text in Lore (the seed record classifies Fire Breath as an action), uses incomplete Bite prose, and omits blindsight from the senses example. Panel headings and content are supplied by this story, not defined as universal section types.",
      },
    },
  },
  render: () => (
    <CandidatePreview>
      <MonsterDetailRegionsCandidate
        panels={[
          {
            heading: "Actions",
            content: (
              <>
                <h3>Attacks &amp; Actions</h3>
                <p>
                  <strong>Bite:</strong> Melee Weapon Attack.
                </p>
              </>
            ),
          },
          {
            heading: "Defenses",
            content: (
              <p>
                <strong>Senses</strong> darkvision 120 ft., passive Perception 18
              </p>
            ),
          },
          {
            heading: "Lore",
            content: (
              <>
                <p>
                  <strong>Fire Breath:</strong> The dragon exhales fire in a cone.
                </p>
                <p>
                  <strong>Languages</strong> Common, Draconic
                </p>
              </>
            ),
          },
        ]}
      />
    </CandidatePreview>
  ),
};
