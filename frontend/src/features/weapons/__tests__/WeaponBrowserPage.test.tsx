import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetViewport, setViewport } from "../../../test/viewport";
import * as api from "../../../api/client";
import type { Weapon } from "../../../api/types";
import { WeaponBrowserPage } from "../WeaponBrowserPage";

const weapons: Weapon[] = [
  {
    id: 1,
    name: "Longsword",
    base_weapon: "Longsword",
    rarity: null,
    weapon_category: "martial",
    weight: 3,
    req_attune: null,
    property: ["V"],
    focus: [],
    attack: [{ type: "melee", damage: "1d8", damage_type: "slashing", hands: 1 }],
    entries: ["A sturdy blade."],
    quick_rules: "Attack +{weapon_attack_bonus}",
    weapon_attack_bonus: 6,
  },
  {
    id: 2,
    name: "+1 Moon Sickle",
    base_weapon: "Sickle",
    rarity: "uncommon",
    weapon_category: "simple",
    weight: 2,
    req_attune: "by a druid or ranger",
    property: ["L"],
    focus: ["Druid", "Ranger"],
    attack: [{ type: "melee", damage: "1d4", damage_type: "slashing", hands: 1 }],
    entries: ["This silver-bladed sickle glimmers softly."],
    quick_rules: "Attack +{weapon_attack_bonus}",
    weapon_attack_bonus: 7,
  },
];

describe("WeaponBrowserPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders quick rules before the long weapon text", async () => {
    vi.spyOn(api, "listWeapons").mockResolvedValue(weapons);
    const user = userEvent.setup();

    render(<WeaponBrowserPage />);
    await waitFor(() => expect(screen.getByText("Longsword")).toBeInTheDocument());
    await user.click(screen.getByText("Longsword"));

    expect(screen.getByText("Attack +6")).toBeInTheDocument();
  });

  it("falls back to readable text when a quick rule has no sheet-ready total", async () => {
    const generic: Weapon = {
      ...weapons[0],
      id: 3,
      name: "Club",
      weapon_attack_bonus: null,
    };
    vi.spyOn(api, "listWeapons").mockResolvedValue([generic]);

    render(<WeaponBrowserPage />);

    expect(await screen.findByText("Attack +your attack bonus")).toBeInTheDocument();
  });

  it("names affected characters when deleting an assigned weapon", async () => {
    vi.spyOn(api, "listWeapons").mockResolvedValue(weapons);
    vi.spyOn(api, "getWeaponPlayers").mockResolvedValue([
      { id: 1, name: "Aria" },
      { id: 2, name: "Bram" },
    ]);
    const user = userEvent.setup();

    render(<WeaponBrowserPage />);
    await waitFor(() => expect(screen.getByText("Longsword")).toBeInTheDocument());
    await user.click(screen.getByText("Longsword"));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(
      await screen.findByRole("alertdialog", {
        name: 'Delete "Longsword"? This cannot be undone. Aria and Bram will lose this weapon assignment.',
      }),
    ).toBeInTheDocument();
  });

  it("shows the plain confirmation for an unassigned weapon", async () => {
    vi.spyOn(api, "listWeapons").mockResolvedValue(weapons);
    vi.spyOn(api, "getWeaponPlayers").mockResolvedValue([]);
    const user = userEvent.setup();

    render(<WeaponBrowserPage />);
    await waitFor(() => expect(screen.getByText("Longsword")).toBeInTheDocument());
    await user.click(screen.getByText("Longsword"));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(
      await screen.findByRole("alertdialog", {
        name: 'Delete "Longsword"? This cannot be undone.',
      }),
    ).toBeInTheDocument();
  });

  it("lists weapons sorted by name and shows the first one selected", async () => {
    vi.spyOn(api, "listWeapons").mockResolvedValue(weapons);

    render(<WeaponBrowserPage />);

    await waitFor(() => expect(screen.getByText("Longsword")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: /Moon Sickle/ })).toBeInTheDocument();
  });

  it("selecting a weapon shows its attack details", async () => {
    vi.spyOn(api, "listWeapons").mockResolvedValue(weapons);
    const user = userEvent.setup();

    render(<WeaponBrowserPage />);
    await waitFor(() => expect(screen.getByText("Longsword")).toBeInTheDocument());

    await user.click(screen.getByText("Longsword"));
    expect(screen.getByRole("heading", { name: "Longsword" })).toBeInTheDocument();
    expect(screen.getByText(/slashing/)).toBeInTheDocument();
  });

  it("opens the editor when New Weapon is clicked", async () => {
    vi.spyOn(api, "listWeapons").mockResolvedValue(weapons);
    const user = userEvent.setup();

    render(<WeaponBrowserPage />);
    await waitFor(() => expect(screen.getByText("Longsword")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "New Weapon" }));
    expect(screen.getByRole("dialog", { name: "Add New Weapon" })).toBeInTheDocument();
  });

  it("copies the selected weapon into a new weapon draft", async () => {
    vi.spyOn(api, "listWeapons").mockResolvedValue(weapons);
    vi.spyOn(api, "getWeaponProperties").mockResolvedValue([]);
    vi.spyOn(api, "getDamageTypes").mockResolvedValue([]);
    const created: Weapon = { ...weapons[1], id: 9, name: "Copied Moon Sickle" };
    const createWeapon = vi.spyOn(api, "createWeapon").mockResolvedValue(created);
    const updateWeapon = vi.spyOn(api, "updateWeapon").mockResolvedValue(weapons[1]);
    const user = userEvent.setup();

    render(<WeaponBrowserPage />);
    await screen.findByRole("heading", { name: /Moon Sickle/ });

    await user.click(screen.getByRole("button", { name: "Copy as New" }));

    expect(screen.getByRole("dialog", { name: "Add New Weapon" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("+1 Moon Sickle");
    expect(screen.getByLabelText("Quick Rules")).toHaveValue("Attack +{weapon_attack_bonus}");
    expect(screen.getByLabelText("Attack Bonus (sheet-ready)")).toHaveValue(7);

    await user.click(screen.getByRole("button", { name: "Create Weapon" }));

    await waitFor(() => expect(createWeapon).toHaveBeenCalledOnce());
    expect(createWeapon).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "+1 Moon Sickle",
        quick_rules: "Attack +{weapon_attack_bonus}",
        weapon_attack_bonus: 7,
      }),
    );
    expect(updateWeapon).not.toHaveBeenCalled();
  });

  it("shows loading before empty data and reports errors", async () => {
    let reject!: (reason?: unknown) => void;
    vi.spyOn(api, "listWeapons").mockReturnValue(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    render(<WeaponBrowserPage />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    reject(new Error("network down"));
    expect(await screen.findByText("network down")).toBeInTheDocument();
  });

  it("shows filtered-empty state and returns from the detail view", async () => {
    vi.spyOn(api, "listWeapons").mockResolvedValue(weapons);
    const user = userEvent.setup();
    render(<WeaponBrowserPage />);

    await screen.findByRole("heading", { name: /Moon Sickle/ });
    await user.type(screen.getByRole("searchbox"), "missing");
    expect(screen.getByText("No matches")).toBeInTheDocument();
    await user.click(screen.getByText("Back to weapons"));
    expect(screen.getByRole("heading", { name: /Moon Sickle/ })).toBeInTheDocument();
  });

  describe("responsive narrow breakpoint", () => {
    afterEach(() => {
      resetViewport();
    });

    it("shows Back to weapons at 520px narrow breakpoint", async () => {
      vi.spyOn(api, "listWeapons").mockResolvedValue(weapons);
      setViewport(520, 800);
      const user = userEvent.setup();
      render(<WeaponBrowserPage />);

      await screen.findByText("Longsword");
      await user.click(screen.getByText("Longsword"));

      const backBtn = screen.getByRole("button", { name: "Back to weapons" });
      expect(backBtn).toBeInTheDocument();
      await user.click(backBtn);
      expect(
        screen.getAllByText("Longsword").find((element) => element.closest(".search-list-item")),
      ).toBeInTheDocument();
    });
  });
});
