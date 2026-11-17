import { expect, test } from "@playwright/test";
import { seriousViolations } from "./a11y";
import { simLive, simSpeed, simStage } from "./sim";

// A line waiting at its merge gate after the review rejected it. The review's warn line is coral on
// the ask's alarm wash, where the first coral held 4.42:1. The state is staged, so it is measured on
// every run, not only when the simulator happens to draw a rejection.
const PROJECT = "atlas-docs";

test.describe("a line at its merge gate after the review rejected it", () => {
  test.beforeAll(async () => {
    const speed = await simSpeed();
    await simSpeed(20);
    try {
      await simStage(PROJECT, "merge_rejected");
      await expect
        .poll(async () => (await simLive()).find((j) => j.project === PROJECT)?.state, { timeout: 30_000 })
        .toBe("awaiting_your_merge");
    } finally {
      await simSpeed(speed);
    }
  });

  for (const theme of ["dark", "light"] as const) {
    test(`has no serious accessibility violation in the ${theme} theme`, async ({ page }) => {
      if (theme === "light") await page.addInitScript(() => localStorage.setItem("bf_theme", "light"));
      await page.goto(`/p/${PROJECT}`);
      await expect(page.locator('[data-level="warn"]', { hasText: "the review rejected it" })).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });
  }
});
