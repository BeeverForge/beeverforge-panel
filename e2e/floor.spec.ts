import { expect, test } from "@playwright/test";
import { seriousViolations } from "./a11y";
import { simLive, simSpeed, simStage } from "./sim";

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
  const project = "atlas-docs";
  const speed = await simSpeed();
  try {
    await simSpeed(1);
    await simStage(project, "merge_human");
    const live = (await simLive()).find((j) => j.project === project);
    expect(live, "the staged line must be running").toBeDefined();
    await page.goto("/");
    const row = page.getByRole("region", { name: "Production lines" }).getByRole("link", { name: project, exact: true }).locator("..");
    const where = row.getByText(new RegExp(`^#${live!.issue} at `));
    await expect(where).toBeVisible();
    const before = await where.textContent();
    await expect(where).not.toHaveText(before ?? "", { timeout: 45_000 });
  } finally {
    await simSpeed(speed);
  }
});

test("the floor has no serious accessibility violation", async ({ page }) => {
  // Live journal updates replace card details while axe scans. Respect reduced motion so a
  // transient fade does not look like the settled text's contrast.
  await page.emulateMedia({ reducedMotion: "reduce" });
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
