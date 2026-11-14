import { expect, test } from "@playwright/test";
import { seriousViolations } from "./a11y";

test("a new card gets pickup's verdict while it is written, and lands in Backlog", async ({ page }) => {
  await page.goto("/p/atlas-docs/board?create=true");
  const form = page.getByRole("dialog", { name: "New card" });
  const title = `Print-friendly guide pages ${Date.now()}`;
  await form.getByLabel("Title").fill(title);
  await expect(form.getByRole("status")).toContainText(/Pickup would (take|refuse)/);
  await form.getByLabel(/Objective/).fill("Readers print the setup guide for site visits.");
  await form.getByLabel("Criterion 1").fill("printing a guide page drops the navigation");
  await expect(form.getByRole("status")).toContainText("Pickup would take this card");
  await form.getByRole("button", { name: "Create card" }).click();
  await expect(page.getByRole("region", { name: /^Backlog/ }).getByText(title)).toBeVisible();
});

test("a card moves to the queue from the keyboard, and back", async ({ page }) => {
  await page.goto("/p/atlas-docs/board");
  const backlog = page.getByRole("region", { name: /^Backlog/ });
  const card = backlog.locator("[data-card]").first();
  const ref = (await card.getAttribute("data-card"))!;
  await card.focus();
  await page.keyboard.press("ArrowRight");
  const queued = page.getByRole("region", { name: /^TO-DO/ }).locator(`[data-card="${ref}"]`);
  await expect(queued).toBeVisible();
  await queued.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(backlog.locator(`[data-card="${ref}"]`)).toBeVisible();
});

test("the board has no serious accessibility violation", async ({ page }) => {
  await page.goto("/p/harbour-ledger/board");
  await page.getByRole("region", { name: /^Backlog/ }).waitFor();
  expect(await seriousViolations(page)).toEqual([]);
});
