import { expect, test } from "@playwright/test";

// Live-backend check for the app profile: the request goes through the running
// app's vite dev server (baseURL) and its /api proxy to the real backend, the
// same path a browser session uses.
test("the running app reaches the live backend health endpoint", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({ status: "ok" });
});
