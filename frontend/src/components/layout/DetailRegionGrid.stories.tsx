import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { DetailRegionGrid } from "./DetailRegionGrid";

const meta = {
  title: "Production/Design System/Layout/Detail Region Grid",
  tags: ["status-production"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A general-purpose responsive grid for an arbitrary number of titled content regions. Choose a column count or auto to wrap regions before text columns get too narrow.",
      },
    },
  },
} satisfies Meta;

export default meta;

interface RegionArgs {
  title: string;
  subtitle: string;
  text: string;
}

interface DetailRegionGridArgs {
  regions: RegionArgs[];
  regionCount: number;
  columns: number | "auto";
}

const maxRegionCount = 12;

export const ArbitraryRegions: StoryObj<DetailRegionGridArgs> = {
  name: "Detail regions — change the count",
  args: {
    regionCount: 3,
    columns: 3,
    regions: [
      {
        title: "Project notes",
        subtitle: "Recent updates",
        text: "The first draft is ready for review. Add notes about what changed and what still needs a closer look before the next meeting.",
      },
      {
        title: "Open questions",
        subtitle: "Decisions to make",
        text: "Choose a date for the next check-in.",
      },
      { title: "References", subtitle: "Useful links", text: "Design brief and meeting notes." },
    ],
  },
  argTypes: {
    regionCount: {
      control: { type: "range", min: 0, max: maxRegionCount, step: 1 },
      description: "Try zero through twelve regions. The preview buttons adjust this count too.",
    },
    columns: {
      control: "select",
      options: ["auto", 1, 2, 3, 4, 5, 6],
      description:
        "Choose a column count, or auto for columns that wrap when text would be too narrow.",
    },
    regions: {
      control: "object",
      description: "Edit each region's title, optional subtitle, and content.",
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Change the number of regions and their content with Controls or the preview buttons. Try one column for long text, or auto to fit as many readable columns as space allows.",
      },
    },
  },
  render: function DetailRegionGridPlayground({ regions, regionCount, columns }) {
    const [, updateArgs] = useArgs<DetailRegionGridArgs>();
    const visibleRegions = Array.from({ length: regionCount }, (_, index) => {
      const region = regions[index];
      return region
        ? {
            title: region.title,
            subtitle: region.subtitle || undefined,
            content: <p>{region.text}</p>,
          }
        : {
            title: `Extra region ${index + 1}`,
            subtitle: "Custom content",
            content: <p>Example content for region {index + 1}.</p>,
          };
    });

    return (
      <div className="detail-region-grid-playground">
        <div
          className="detail-region-grid-playground-controls"
          role="group"
          aria-label="Adjust region count"
        >
          <button
            type="button"
            onClick={() => updateArgs({ regionCount: Math.max(0, regionCount - 1) })}
            disabled={regionCount === 0}
          >
            Remove region
          </button>
          <output aria-live="polite">
            {regionCount} {regionCount === 1 ? "region" : "regions"}
          </output>
          <button
            type="button"
            onClick={() => updateArgs({ regionCount: Math.min(maxRegionCount, regionCount + 1) })}
            disabled={regionCount === maxRegionCount}
          >
            Add region
          </button>
        </div>
        <div className="detail-region-grid-playground__surface">
          <DetailRegionGrid regions={visibleRegions} columns={columns} />
        </div>
      </div>
    );
  },
};
