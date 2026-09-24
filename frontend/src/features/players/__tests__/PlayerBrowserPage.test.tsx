import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../../api/client";
import type { Player, PlayerDetail, Spell, Weapon } from "../../../api/types";
import { PlayerBrowserPage } from "../PlayerBrowserPage";

const players: Player[] = [
  { id: 1, name: "Pip", class: "Wizard", level: 1 },
  { id: 2, name: "Lark", class: "Wizard", level: 1 },
];

const spellFireball: Spell = {
  id: 10,
  name: "Fireball",
  level: 3,
  school: "Evocation",
  categories: ["Other"],
  casting_times: ["1 action"],
  range: "150 feet",
  components: ["V", "S", "M"],
  duration: "Instantaneous",
  concentration: false,
  ritual: false,
  description: "",
  alternate_description: null,
  higher_levels: { text: null, damage_by_slot: {} },
  damage: [],
  healing: { amount: null, temp_hp: false, max_hp: false },
  attacks: [],
  area_of_effect: { shape: null, size: null },
  quick_rules: null,
  materials: null,
} as unknown as Spell;

const weaponDagger: Weapon = {
  id: 20,
  name: "Dagger",
} as unknown as Weapon;

const detailFor = (player: Player, spells: Spell[] = [], weapons: Weapon[] = []): PlayerDetail => ({
  ...player,
  spells,
  weapons,
});

describe("PlayerBrowserPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "listSpells").mockResolvedValue([spellFireball]);
    vi.spyOn(api, "listWeapons").mockResolvedValue([weaponDagger]);
    vi.spyOn(api, "getPlayerDetail").mockImplementation(async (id: number) => {
      const player = players.find((p) => p.id === id)!;
      return detailFor(player);
    });
  });

  it("lists players sorted by name and shows the first one selected", async () => {
    vi.spyOn(api, "listPlayers").mockResolvedValue(players);

    render(<PlayerBrowserPage />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Lark" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Lark/ })).toBeInTheDocument();
  });

  it("selecting a player shows their detail card", async () => {
    vi.spyOn(api, "listPlayers").mockResolvedValue(players);
    const user = userEvent.setup();

    render(<PlayerBrowserPage />);
    await waitFor(() => expect(screen.getByText("Pip")).toBeInTheDocument());

    await user.click(screen.getByText("Pip"));
    expect(screen.getByRole("heading", { name: "Pip" })).toBeInTheDocument();
  });

  it("opens the editor when New Player is clicked", async () => {
    vi.spyOn(api, "listPlayers").mockResolvedValue(players);
    const user = userEvent.setup();

    render(<PlayerBrowserPage />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Lark" })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "New Player" }));
    expect(screen.getByRole("dialog", { name: "Add New Player" })).toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    vi.spyOn(api, "listPlayers").mockRejectedValue(new Error("boom"));

    render(<PlayerBrowserPage />);
    await waitFor(() => expect(screen.getByText("boom")).toBeInTheDocument());
  });

  it("keeps loading distinct from an empty collection", () => {
    vi.spyOn(api, "listPlayers").mockReturnValue(new Promise(() => {}));
    render(<PlayerBrowserPage />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("No players found.")).not.toBeInTheDocument();
  });

  it("shows filtered-empty state and returns from the detail view", async () => {
    vi.spyOn(api, "listPlayers").mockResolvedValue(players);
    const user = userEvent.setup();
    render(<PlayerBrowserPage />);

    await screen.findByRole("heading", { name: "Lark" });
    await user.type(screen.getByRole("searchbox"), "missing");
    expect(screen.getByText("No matches")).toBeInTheDocument();
    // The back affordance is mobile-only (`.browser-layout-back` is display:none above 520px), and
    // jsdom never matches the media query — so it has no accessible name here. Query by text.
    await user.click(screen.getByText("Back to players"));
    expect(screen.getByRole("heading", { name: "Lark" })).toBeInTheDocument();
  });

  it("does not re-fetch a player detail already cached from a previous visit", async () => {
    vi.spyOn(api, "listPlayers").mockResolvedValue(players);
    const getPlayerDetail = vi
      .spyOn(api, "getPlayerDetail")
      .mockImplementation(async (id: number) => {
        const player = players.find((p) => p.id === id)!;
        return detailFor(player);
      });
    const user = userEvent.setup();

    render(<PlayerBrowserPage />);
    await screen.findByRole("heading", { name: "Lark" });

    await user.click(screen.getByText("Pip"));
    await screen.findByRole("heading", { name: "Pip" });

    await user.click(screen.getByText("Lark"));
    await screen.findByRole("heading", { name: "Lark" });

    expect(getPlayerDetail).toHaveBeenCalledTimes(2);
  });

  it("prefetches every other player detail in the background after the roster loads", async () => {
    vi.spyOn(api, "listPlayers").mockResolvedValue(players);
    const getPlayerDetail = vi
      .spyOn(api, "getPlayerDetail")
      .mockImplementation(async (id: number) => {
        const player = players.find((p) => p.id === id)!;
        return detailFor(player);
      });

    render(<PlayerBrowserPage />);
    await screen.findByRole("heading", { name: "Lark" });

    await waitFor(() => {
      for (const player of players) {
        expect(getPlayerDetail).toHaveBeenCalledWith(player.id);
      }
    });
  });

  it("shows the destructive delete confirmation copy", async () => {
    vi.spyOn(api, "listPlayers").mockResolvedValue(players);
    const user = userEvent.setup();
    render(<PlayerBrowserPage />);

    await screen.findByRole("heading", { name: "Lark" });
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(
      screen.getByText(
        'Delete "Lark"? Spell and weapon assignments will be removed. Catalog records will remain. This cannot be undone.',
      ),
    ).toBeInTheDocument();
  });

  it("shows read-only assigned spells and weapons with no inline mutation controls", async () => {
    vi.spyOn(api, "listPlayers").mockResolvedValue(players);
    vi.spyOn(api, "getPlayerDetail").mockImplementation(async (id: number) => {
      const player = players.find((p) => p.id === id)!;
      return detailFor(player, [spellFireball], [weaponDagger]);
    });

    render(<PlayerBrowserPage />);

    await screen.findByRole("heading", { name: "Lark" });
    expect(await screen.findByText("Fireball")).toBeInTheDocument();
    expect(screen.getByText("Dagger")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage Spells" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage Weapons" })).toBeInTheDocument();
  });

  it("stages a spell change through Manage Spells and commits it via one atomic Save", async () => {
    vi.spyOn(api, "listPlayers").mockResolvedValue(players);
    const replacePlayerSpells = vi
      .spyOn(api, "replacePlayerSpells")
      .mockResolvedValue([spellFireball]);
    const user = userEvent.setup();

    render(<PlayerBrowserPage />);
    await screen.findByRole("heading", { name: "Lark" });
    await screen.findByText("No spells assigned.");

    await user.click(screen.getByRole("button", { name: "Manage Spells" }));
    expect(screen.getByRole("dialog", { name: "Manage Spells" })).toBeInTheDocument();

    await user.click(screen.getByLabelText("Fireball"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(replacePlayerSpells).toHaveBeenCalledWith(2, [10]));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Manage Spells" })).not.toBeInTheDocument(),
    );
  });

  it("discards staged spell changes on Cancel without calling the API", async () => {
    vi.spyOn(api, "listPlayers").mockResolvedValue(players);
    const replacePlayerSpells = vi.spyOn(api, "replacePlayerSpells").mockResolvedValue([]);
    const user = userEvent.setup();

    render(<PlayerBrowserPage />);
    await screen.findByRole("heading", { name: "Lark" });

    await user.click(await screen.findByRole("button", { name: "Manage Spells" }));
    await user.click(screen.getByLabelText("Fireball"));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(replacePlayerSpells).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Manage Spells" })).not.toBeInTheDocument();
  });
});
