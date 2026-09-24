import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { retryAxeWhenBusy } from "./axe-busy-retry";

const STORYBOOK_URL = "http://127.0.0.1:6006";
const STORYBOOK_ROOT = "#storybook-root";
const STORY_ID = "example-page--logged-out";

async function openStory(page: Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${STORYBOOK_URL}/iframe.html?id=${STORY_ID}&viewMode=story`);
  await expect(page.locator(STORYBOOK_ROOT)).toBeVisible();
}

async function checkA11y(page: Page) {
  const results = await retryAxeWhenBusy(page, () =>
    new AxeBuilder({ page })
      .include(STORYBOOK_ROOT)
      .disableRules([
        // Storybook's iframe is not the application document and has no h1.
        "landmark-one-main",
        "page-has-heading-one",
        "region",
      ])
      .analyze(),
  );
  expect(results.violations).toEqual([]);
}

test("Example/Page logged-out story has no accessibility violations", async ({ page }) => {
  await openStory(page);
  await checkA11y(page);
});
