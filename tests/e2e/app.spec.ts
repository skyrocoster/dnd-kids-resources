import { expect, test } from "@playwright/test";

test("opens a reference chapter from the field guide", async ({ page }) => {
  await page.route("**/api/spells", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: 1,
          name: "Cure Wounds",
          level: 1,
          school: "evocation",
          categories: ["Heal"],
          description: "A creature regains hit points.",
          alternate_description: null,
          quick_rules: null,
          damage: [],
          healing: { amount: null, temp_hp: false, max_hp: false },
          range: "Touch",
          higher_levels: { text: null, damage_by_slot: {} },
          casting_times: ["1 action"],
          duration: "Instantaneous",
          concentration: false,
          ritual: false,
          components: ["V", "S"],
          materials: null,
          attacks: [],
          area_of_effect: null,
        },
      ]),
    }),
  );

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Field Guide" })).toBeVisible();
  await page.getByRole("link", { name: "Spells" }).first().click();

  await expect(page).toHaveURL(/\/spells$/);
  await expect(page.getByRole("heading", { name: "Cure Wounds" })).toBeVisible();
  await expect(page.getByText("A creature regains hit points.")).toBeVisible();
});
