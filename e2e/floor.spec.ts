import { expect, test } from "@playwright/test";
import { seriousViolations } from "./a11y";
import { simLive } from "./sim";

const MOVING = new Set(["sizing", "spec_validation", "preparing", "planning", "implementing", "validating", "repairing", "reviewing", "pr_open"]);

test("the floor shows every line, and its sentence is the server's", async ({ page }) => {
  await page.goto("/");
  const cabinet = page.getByRole("region", { name: "Production lines" });
  await expect(cabinet).toBeVisible();
  for (const name of ["harbour-ledger", "tidepool-mobile", "quarry-api", "atlas-docs"]) {
    await expect(cabinet.getByRole("link", { name, exact: true })).toBeVisible();
  }
  const floor = await (await page.request.get("/api/v1/floor")).json();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(floor.word);
});

test("a card moves to its next station without a reload", async ({ page }) => {
  await page.goto("/");
  const live = (await simLive()).find((j) => !j.action && MOVING.has(j.state));
  test.skip(!live, "no line is between stations right now");
  const row = page.getByRole("region", { name: "Production lines" }).getByRole("link", { name: live!.project, exact: true }).locator("..");
  const where = row.getByText(new RegExp(`^#${live!.issue} at `));
  const before = await where.textContent();
  await expect(where).not.toHaveText(before ?? "", { timeout: 45_000 });
});

test("what needs a person can be answered where it is shown", async ({ page }) => {
  await page.goto("/");
  const needs = page.getByRole("complementary", { name: "Needs you" });
  // An answer that opens a form (a release, an adjustment) is not a one-click answer.
  const item = needs.locator("li").filter({ has: page.locator("button:not(:has-text('…'))") }).first();
  test.skip((await item.count()) === 0, "nothing answerable in one click right now");
  const who = (await item.locator("a").first().textContent())!.trim();
  await item.locator("button").first().click();
  await expect(page.getByRole("region", { name: "Notifications" }).getByText(who)).toBeVisible();
});

test("the floor has no serious accessibility violation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("region", { name: "Production lines" }).waitFor();
  expect(await seriousViolations(page)).toEqual([]);
});

test("a line's page has no serious accessibility violation", async ({ page }) => {
  await page.goto("/p/tidepool-mobile");
  await page.getByRole("heading", { name: "tidepool-mobile", level: 1 }).waitFor();
  await page.waitForTimeout(2000);
  expect(await seriousViolations(page)).toEqual([]);
});

for (const width of [320, 375, 414]) {
  test(`the floor fits a ${width}px phone`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.getByRole("region", { name: "Production lines" }).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
