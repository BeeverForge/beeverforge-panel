import { expect, test } from "@playwright/test";
import { seriousViolations } from "./a11y";
import { simStage } from "./sim";

const pages = [
  { name: "floor", url: "/", ready: "Production lines", role: "region" },
  { name: "line", url: "/p/tidepool-mobile", ready: "tidepool-mobile", role: "heading" },
  { name: "board", url: "/p/harbour-ledger/board", ready: "Backlog", role: "region" },
  { name: "logs", url: "/logs", ready: "Find a run", role: "searchbox" },
  { name: "costs", url: "/costs", ready: "Filters", role: "group" },
  { name: "product room", url: "/product/harbour-ledger", ready: "Finance can download the week's reconciled lines", role: "text" },
] as const;

for (const theme of ["dark", "light"] as const) {
  for (const target of pages) {
    test(`${target.name} has no serious accessibility violations in ${theme}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      if (theme === "light") await page.addInitScript(() => localStorage.setItem("bf_theme", "light"));
      if (target.name === "line") await simStage("tidepool-mobile", "merge_human");
      await page.goto(target.url);
      if (target.role === "text") {
        await expect(page.getByText(target.ready)).toBeVisible();
      } else {
        await expect(page.getByRole(target.role, { name: new RegExp(target.ready) }).first()).toBeVisible();
      }
      if (target.name === "floor") await expect(page.getByRole("link", { name: "harbour-ledger", exact: true }).first()).toBeVisible();
      if (target.name === "line") await expect(page.getByRole("list", { name: "Stations" })).toBeVisible();
      if (target.name === "logs") await expect(page.getByRole("complementary", { name: "Runs" }).locator("ol li").first()).toBeVisible();
      await expect.poll(() => page.locator("html").getAttribute("data-theme")).toBe(theme === "light" ? "light" : null);
      expect(await seriousViolations(page)).toEqual([]);
    });
  }
}
