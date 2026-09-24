import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetViewport, setViewport } from "../../../test/viewport";
import * as api from "../../../api/client";
import type { Player, Spell } from "../../../api/types";
import { SpellBrowserPage } from "../SpellBrowserPage";
import { targetSpell } from "./spellFixtures";

const players: Player[] = [
  { id: 1, name: "Ari", class: "Wizard", level: 3 },
  { id: 2, name: "Mira", class: "Cleric", level: 4 },
  { id: 3, name: "Bryn", class: "Druid", level: 2 },
];
const spells: Spell[] = [
  {
    ...targetSpell,
    id: 2,
    name: "Cure Wounds",
    level: 1,
    description: "A creature regains 1d8+3 hit points.",
    casting_times: ["1 action"],
    range: "Touch",
  },
  targetSpell,
];

describe("SpellBrowserPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists spells sorted by level and shows the first spell selected", async () => {
    vi.spyOn(api, "listSpells").mockResolvedValue(spells);

    render(<SpellBrowserPage />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Cure Wounds/ })).toBeInTheDocument(),
    );
    expect(screen.getByRole("heading", { name: /Cure Wounds/ })).toBeInTheDocument();
  });

  it("selecting a different spell updates the detail pane", async () => {
    vi.spyOn(api, "listSpells").mockResolvedValue(spells);
    const user = userEvent.setup();

    render(<SpellBrowserPage />);
    await waitFor(() => expect(screen.getByText("Plant Growth")).toBeInTheDocument());

    await user.click(screen.getByText("Plant Growth"));
    expect(screen.getByRole("heading", { name: /Plant Growth/ })).toBeInTheDocument();
    expect(screen.getByText("1 action or 8 hours")).toBeInTheDocument();
    expect(screen.getByText("V, S")).toBeInTheDocument();
  });

  it("shows quick rules before the full description", async () => {
    vi.spyOn(api, "listSpells").mockResolvedValue(spells);
    const user = userEvent.setup();

    render(<SpellBrowserPage />);
    await screen.findByText("Plant Growth");

    await user.click(screen.getByText("Plant Growth"));
    const quickRules = screen.getByText(targetSpell.quick_rules!);
    const description = screen.getByText(targetSpell.description);

    expect(
      quickRules.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders quick-rule dice and generic spell value fallbacks without token syntax", async () => {
    const spellWithReferences: Spell = {
      ...targetSpell,
      id: 10,
      name: "Reference Bolt",
      categories: ["Other"],
      level: 0,
      quick_rules: "Roll 1d20 + {spell_attack_bonus}; target saves against {spell_save_dc}.",
      description: "Full reference description.",
    };
    vi.spyOn(api, "listSpells").mockResolvedValue([spellWithReferences]);

    const { container } = render(<SpellBrowserPage />);
    await screen.findByRole("heading", { name: /Reference Bolt/ });

    expect(container.querySelector(".spell-browser-quick-rules .dice-pill")).toHaveTextContent(
      "1d20",
    );
    expect(container).toHaveTextContent(
      "Roll 1d20 + your spell attack bonus; target saves against your spell save DC.",
    );
    expect(container.textContent).not.toContain("{spell_attack_bonus}");
    expect(container.textContent).not.toContain("{spell_save_dc}");
  });
  it("opens the editor when New Spell is clicked", async () => {
    vi.spyOn(api, "listSpells").mockResolvedValue(spells);
    const user = userEvent.setup();

    render(<SpellBrowserPage />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Cure Wounds/ })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "New Spell" }));
    expect(screen.getByRole("dialog", { name: "Add New Spell" })).toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    vi.spyOn(api, "listSpells").mockRejectedValue(new Error("network down"));

    render(<SpellBrowserPage />);
    await waitFor(() => expect(screen.getByText(/network down/)).toBeInTheDocument());
  });

  it("keeps the loading state distinct from an empty collection", () => {
    let resolve!: (value: Spell[]) => void;
    vi.spyOn(api, "listSpells").mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );

    render(<SpellBrowserPage />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("No spells found.")).not.toBeInTheDocument();
    resolve([]);
  });

  it("shows filtered-empty state and returns from the detail view", async () => {
    vi.spyOn(api, "listSpells").mockResolvedValue(spells);
    const user = userEvent.setup();
    render(<SpellBrowserPage />);

    await screen.findByRole("heading", { name: /Cure Wounds/ });
    await user.type(screen.getByRole("searchbox"), "missing");
    expect(screen.getByText("No matches")).toBeInTheDocument();
    await user.click(screen.getByText("Back to spells"));
    expect(screen.getByRole("heading", { name: /Cure Wounds/ })).toBeInTheDocument();
  });

  describe("responsive narrow breakpoint", () => {
    afterEach(() => {
      resetViewport();
    });

    it("shows Back to spells at 520px narrow breakpoint", async () => {
      vi.spyOn(api, "listSpells").mockResolvedValue(spells);
      setViewport(520, 800);
      const user = userEvent.setup();
      render(<SpellBrowserPage />);

      await screen.findAllByText("Cure Wounds");
      const cureWoundsRow = screen
        .getAllByText("Cure Wounds")
        .find((element) => element.closest(".search-list-item"));
      await user.click(cureWoundsRow!);

      const backBtn = screen.getByRole("button", { name: "Back to spells" });
      expect(backBtn).toBeInTheDocument();
      await user.click(backBtn);
      expect(
        screen.getAllByText("Cure Wounds").find((element) => element.closest(".search-list-item")),
      ).toBeInTheDocument();
    });
  });

  it("opens Manage Players with current spell assignments checked", async () => {
    vi.spyOn(api, "listSpells").mockResolvedValue(spells);
    vi.spyOn(api, "listPlayers").mockResolvedValue(players);
    vi.spyOn(api, "getSpellPlayers").mockResolvedValue([players[1]]);
    const user = userEvent.setup();

    render(<SpellBrowserPage />);
    await screen.findByRole("heading", { name: /Cure Wounds/ });

    await user.click(screen.getByRole("button", { name: "Manage Players" }));

    expect(
      await screen.findByRole("dialog", { name: /Manage Players for Cure Wounds/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Mira" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Ari" })).not.toBeChecked();
  });

  it("filters Manage Players to No matches", async () => {
    vi.spyOn(api, "listSpells").mockResolvedValue(spells);
    vi.spyOn(api, "listPlayers").mockResolvedValue(players);
    vi.spyOn(api, "getSpellPlayers").mockResolvedValue([players[1]]);
    const user = userEvent.setup();

    render(<SpellBrowserPage />);
    await screen.findByRole("heading", { name: /Cure Wounds/ });
    await user.click(screen.getByRole("button", { name: "Manage Players" }));
    await screen.findByRole("checkbox", { name: "Mira" });

    await user.type(screen.getByRole("searchbox", { name: "Search players" }), "zzzz");

    expect(screen.getByText("No matches")).toBeInTheDocument();
  });

  it("shows no-player state in Manage Players", async () => {
    vi.spyOn(api, "listSpells").mockResolvedValue(spells);
    vi.spyOn(api, "listPlayers").mockResolvedValue([]);
    vi.spyOn(api, "getSpellPlayers").mockResolvedValue([]);
    const user = userEvent.setup();

    render(<SpellBrowserPage />);
    await screen.findByRole("heading", { name: /Cure Wounds/ });
    await user.click(screen.getByRole("button", { name: "Manage Players" }));

    expect(await screen.findByText("No players available.")).toBeInTheDocument();
  });

  it("disables Save when Manage Players fails to load", async () => {
    vi.spyOn(api, "listSpells").mockResolvedValue(spells);
    vi.spyOn(api, "listPlayers").mockRejectedValue(new Error("players unavailable"));
    vi.spyOn(api, "getSpellPlayers").mockResolvedValue([]);
    const user = userEvent.setup();

    render(<SpellBrowserPage />);
    await screen.findByRole("heading", { name: /Cure Wounds/ });
    await user.click(screen.getByRole("button", { name: "Manage Players" }));

    expect(await screen.findByText("players unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("keeps filtered-out assignments and saves the sorted atomic replacement payload", async () => {
    vi.spyOn(api, "listSpells").mockResolvedValue(spells);
    vi.spyOn(api, "listPlayers").mockResolvedValue(players);
    vi.spyOn(api, "getSpellPlayers").mockResolvedValue([players[1]]);
    const replaceSpellPlayers = vi
      .spyOn(api, "replaceSpellPlayers")
      .mockResolvedValue([players[0]]);
    const user = userEvent.setup();

    render(<SpellBrowserPage />);
    await screen.findByRole("heading", { name: /Cure Wounds/ });
    await user.click(screen.getByRole("button", { name: "Manage Players" }));
    const search = screen.getByRole("searchbox", { name: "Search players" });
    await user.type(search, "Ari");
    expect(screen.queryByRole("checkbox", { name: "Mira" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("checkbox", { name: "Ari" }));
    await user.clear(search);
    await user.type(search, "zzzz");
    expect(screen.getByText("No matches")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(replaceSpellPlayers).toHaveBeenCalledWith(2, [1, 2]));
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: /Manage Players for Cure Wounds/ }),
      ).not.toBeInTheDocument(),
    );
  });

  it("cancels Manage Players without saving the staged draft", async () => {
    vi.spyOn(api, "listSpells").mockResolvedValue(spells);
    vi.spyOn(api, "listPlayers").mockResolvedValue(players);
    vi.spyOn(api, "getSpellPlayers").mockResolvedValue([players[1]]);
    const replaceSpellPlayers = vi.spyOn(api, "replaceSpellPlayers").mockResolvedValue([]);
    const user = userEvent.setup();

    render(<SpellBrowserPage />);
    await screen.findByRole("heading", { name: /Cure Wounds/ });
    await user.click(screen.getByRole("button", { name: "Manage Players" }));
    await user.click(await screen.findByRole("checkbox", { name: "Ari" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(replaceSpellPlayers).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: /Manage Players for Cure Wounds/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps the Manage Players draft when save fails", async () => {
    vi.spyOn(api, "listSpells").mockResolvedValue(spells);
    vi.spyOn(api, "listPlayers").mockResolvedValue(players);
    vi.spyOn(api, "getSpellPlayers").mockResolvedValue([players[1]]);
    vi.spyOn(api, "replaceSpellPlayers").mockRejectedValue(new Error("save failed"));
    const user = userEvent.setup();

    render(<SpellBrowserPage />);
    await screen.findByRole("heading", { name: /Cure Wounds/ });
    await user.click(screen.getByRole("button", { name: "Manage Players" }));
    const ari = await screen.findByRole("checkbox", { name: "Ari" });
    await user.click(ari);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("status", { name: "" })).toHaveTextContent("save failed");
    expect(screen.getByRole("checkbox", { name: "Ari" })).toBeChecked();
    expect(
      screen.getByRole("dialog", { name: /Manage Players for Cure Wounds/ }),
    ).toBeInTheDocument();
  });
});
