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
    expect(within(regions[0]).getByRole("heading", { level: 4 })).toHaveTextContent(
      "Recent events",
    );
    expect(within(regions[1]).queryByRole("heading", { level: 4 })).not.toBeInTheDocument();
    expect(within(regions[3]).getByText("Additional user content.")).toBeInTheDocument();
  });

  it("renders nothing for zero regions", () => {
    const { container } = render(<DetailRegionGrid regions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("defaults to three columns and lets consumers choose a single column", () => {
    const regions = [{ title: "Actions", content: <p>Long action description.</p> }];
    const { container, rerender } = render(<DetailRegionGrid regions={regions} />);

    expect(container.firstChild).toHaveStyle({ "--detail-region-columns": "3" });

    rerender(<DetailRegionGrid regions={regions} columns={1} />);
    expect(container.firstChild).toHaveStyle({ "--detail-region-columns": "1" });
  });

  it("lets consumers choose automatically wrapping columns", () => {
    const { container } = render(
      <DetailRegionGrid
        regions={[{ title: "Lore", content: <p>Long lore text.</p> }]}
        columns="auto"
      />,
    );

    expect(container.firstChild).toHaveAttribute("data-columns", "auto");
    expect(container.firstChild).not.toHaveStyle({ "--detail-region-columns": "3" });
  });

  it("allows a region to contain another grid with its own column settings", () => {
    const { container } = render(
      <DetailRegionGrid
        columns={1}
        regions={[
          {
            title: "Adventure notes",
            content: (
              <DetailRegionGrid
                columns={2}
                headingLevel={5}
                regions={[
                  { title: "Plan", subtitle: "First step", content: <p>Find the trail.</p> },
                  { title: "Supplies", content: <p>Bring a map.</p> },
                ]}
              />
            ),
          },
        ]}
      />,
    );

    const [outerGrid, innerGrid] = container.querySelectorAll(".detail-region-grid");
    expect(outerGrid).toHaveStyle({ "--detail-region-columns": "1" });
    expect(innerGrid).toHaveStyle({ "--detail-region-columns": "2" });
    expect(within(innerGrid as HTMLElement).getAllByRole("region")).toHaveLength(2);
    expect(
      within(innerGrid as HTMLElement).getByRole("heading", { name: "Plan", level: 5 }),
    ).toBeInTheDocument();
    expect(
      within(innerGrid as HTMLElement).getByRole("heading", { name: "First step", level: 6 }),
    ).toBeInTheDocument();
  });
});
