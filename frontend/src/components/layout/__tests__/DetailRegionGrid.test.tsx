import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DetailRegionGrid } from "../DetailRegionGrid";

describe("DetailRegionGrid", () => {
  it("renders any number of regions in supplied order with optional subtitles and content", () => {
    render(
      <DetailRegionGrid
        regions={[
          { title: "Project notes", subtitle: "Recent events", content: <p>First update.</p> },
          { title: "Current goals", content: <p>Find the draft.</p> },
          { title: "Contacts", subtitle: "People to ask", content: <p>The project lead.</p> },
          { title: "Extra region", content: <p>Additional user content.</p> },
        ]}
      />,
    );

    const regions = screen.getAllByRole("region");
    expect(regions).toHaveLength(4);
    expect(
      regions.map((region) => within(region).getByRole("heading", { level: 3 }).textContent),
    ).toEqual(["Project notes", "Current goals", "Contacts", "Extra region"]);
    expect(within(regions[0]).getByRole("heading", { level: 4 })).toHaveTextContent("Recent events");
    expect(within(regions[1]).queryByRole("heading", { level: 4 })).not.toBeInTheDocument();
    expect(within(regions[3]).getByText("Additional user content.")).toBeInTheDocument();
  });

  it("renders nothing for zero regions", () => {
    const { container } = render(<DetailRegionGrid regions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
