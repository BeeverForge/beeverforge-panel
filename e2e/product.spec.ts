import { expect, test } from "@playwright/test";
import { seriousViolations } from "./a11y";

test("the product role answers, and a request waits for a yes", async ({ page }) => {
  await page.goto("/product/tidepool-mobile");
  await page.getByRole("button", { name: /Your first conversation/ }).click();
  const box = page.getByLabel(/^Message /);
  await box.fill("I need the trail list to show which trails close today.");
  await box.press("Enter");
  await expect(page.getByRole("main").getByText("I need the trail list to show which trails close today.").first()).toBeVisible();
  const waiting = page.getByRole("group", { name: "Waiting for your answer" });
  await expect(waiting).toBeVisible({ timeout: 20_000 });
  await waiting.getByRole("button", { name: "Do not record" }).click();
  await expect(page.getByText("Not recorded. Nothing was written.").last()).toBeVisible();
});

test("the requirements are the product's own", async ({ page }) => {
  await page.goto("/product/harbour-ledger");
  await expect(page.getByText("Finance can download the week's reconciled lines")).toBeVisible();
  await expect(page.getByText("read from the code", { exact: false })).toBeVisible();
});

test("the product room has no serious accessibility violation", async ({ page }) => {
  await page.goto("/product/harbour-ledger");
  await page.getByText("Finance can download the week's reconciled lines").waitFor();
  expect(await seriousViolations(page)).toEqual([]);
});
