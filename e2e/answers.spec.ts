import { expect, test, type Locator, type Page } from "@playwright/test";
import { simLive, simSpeed, simStage } from "./sim";

const project = "quarry-api";

async function pickup(enabled: boolean) {
  const sim = process.env.SIM_URL ?? "http://127.0.0.1:8790";
  const response = await fetch(`${sim}/api/projects/${project}/enabled`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!response.ok) throw new Error(`could not ${enabled ? "enable" : "disable"} pickup: ${response.status}`);
}

test.beforeAll(async () => {
  await pickup(false);
});

test.afterAll(async () => {
  await pickup(true);
});

async function stage(outcome: string, state: string) {
  const speed = await simSpeed();
  await simSpeed(20);
  try {
    await simStage(project, outcome);
    await expect.poll(async () => (await simLive()).find((job) => job.project === project)?.state, { timeout: 30_000 }).toBe(state);
  } finally {
    await simSpeed(speed);
  }
}

async function itemFor(page: Page) {
  await page.goto("/");
  const item = page.getByRole("complementary", { name: "Needs you" }).locator("li").filter({ has: page.getByRole("link", { name: new RegExp(`^${project} #`) }) });
  await expect(item).toBeVisible();
  return item;
}

async function answer(page: Page, path: RegExp, click: () => Promise<void>, expected: Record<string, unknown>) {
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && path.test(new URL(response.url()).pathname));
  await click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  expect(response.request().postDataJSON()).toMatchObject(expected);
  const result = await response.json() as { message?: string; ok?: boolean };
  expect(result.ok).not.toBe(false);
  expect(result.message).toBeTruthy();
  await expect(page.getByRole("region", { name: "Notifications" })).toContainText(result.message!);
}

const gateCases: { name: string; button: string; action: string; outcome?: string; click?: (page: Page, item: Locator) => Promise<void> }[] = [
  { name: "merge", button: "Merge", action: "merge" },
  { name: "re-review", button: "Re-review", action: "review" },
  { name: "address comments on", button: "Address comments", action: "address", outcome: "merge_comments" },
  {
    name: "adjust", button: "Adjust…", action: "adjust",
    click: async (page, item) => {
      await item.getByRole("button", { name: "Adjust…" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("What should change").fill("Add coverage for the empty result.");
      await dialog.getByRole("button", { name: "Send back" }).click();
    },
  },
  {
    name: "discard", button: "Discard", action: "discard",
    click: async (_page, item) => {
      await item.getByRole("button", { name: "Discard" }).click();
      await item.getByRole("button", { name: "Close the PR unmerged" }).click();
    },
  },
];

for (const c of gateCases) {
  test(`a person can ${c.name} a pull request`, async ({ page }) => {
    await stage(c.outcome ?? "merge_human", "awaiting_your_merge");
    const item = await itemFor(page);
    const params = { project, ...(c.action === "adjust" ? { instruction: "Add coverage for the empty result." } : {}) };
    await answer(page, new RegExp(`/api/act/${c.action}$`), () => c.click ? c.click(page, item) : item.getByRole("button", { name: c.button, exact: true }).click(), { params });
  });
}

test("a person can answer a decision", async ({ page }) => {
  await stage("decision", "on_hold");
  const item = await itemFor(page);
  const choice = item.getByRole("button").filter({ hasText: / · / }).first();
  const key = (await choice.textContent())!.split(" · ")[0];
  await answer(page, /\/api\/temporal\/act\//, () => choice.click(), { action: "resume", choice: key });
});

test("a person can retry a held card", async ({ page }) => {
  await stage("fail_hold", "on_hold");
  const item = await itemFor(page);
  await answer(page, /\/api\/temporal\/act\//, () => item.getByRole("button", { name: "Retry from the top" }).click(), { action: "resume" });
});

test("a person can skip a decision", async ({ page }) => {
  await stage("decision", "on_hold");
  const item = await itemFor(page);
  await answer(page, /\/api\/temporal\/act\//, async () => {
    await item.getByRole("button", { name: "Skip", exact: true }).click();
    await item.getByRole("button", { name: "Skip — free the floor" }).click();
  }, { action: "skip" });
});

test("a person can stop a wedged job", async ({ page }) => {
  await stage("wedged", "running");
  const item = await itemFor(page);
  await answer(page, /\/api\/act\/stop$/, async () => {
    await item.getByRole("button", { name: "Stop…" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Why (written on the card, optional)").fill("The job is stuck.");
    await dialog.getByRole("button", { name: "Stop the job" }).click();
  }, { params: { project, reason: "The job is stuck." } });
});

test("a person can approve a production release", async ({ page }) => {
  await stage("prod_approval", "awaiting_prod_approval");
  const item = await itemFor(page);
  await answer(page, /\/api\/temporal\/approve\//, async () => {
    await item.getByRole("button", { name: "Review and release…" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Version to release").fill("1.2.3");
    await dialog.getByLabel("Approver login").fill("operator");
    await dialog.getByLabel("Password").fill("test-password");
    await dialog.getByRole("button", { name: "Release 1.2.3" }).click();
  }, { approver: "operator", password: "test-password", version: "1.2.3" });
});
