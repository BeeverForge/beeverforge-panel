// Records a short, captioned tour of the panel as a video, against the rig and the simulator.
// Restart the simulator first so every line is just starting, with the outcomes the tour needs:
//
//   $env:SIM_SPEED="3"; $env:SIM_FORCE="tidepool-mobile=decision,harbour-ledger=merge_human,quarry-api=repair_then_merge,atlas-docs=merge_auto"; npx tsx sim/server.ts
//   node scripts/demo.mjs [out-dir]
//
// The cursor and the captions are drawn into the recorded page only; the app is not changed.
import { chromium } from "playwright";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.PANEL_URL ?? "http://127.0.0.1:5173";
const out = process.argv[2] ?? "docs/demo";
const tmp = join(out, ".recording");
mkdirSync(out, { recursive: true });
rmSync(tmp, { recursive: true, force: true });

const SIZE = { width: 1440, height: 900 };
const browser = await chromium.launch({ args: ["--hide-scrollbars"] });
const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: tmp, size: SIZE }, deviceScaleFactor: 1 });

await context.addInitScript(() => {
  const draw = () => {
    if (document.getElementById("__demo")) return;
    const style = document.createElement("style");
    style.textContent = `
      #__cur{position:fixed;z-index:2147483647;left:0;top:0;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;
        background:rgba(250,249,246,.92);border:2px solid #1f1f24;box-shadow:0 2px 8px rgba(0,0,0,.5);pointer-events:none;transition:transform .12s}
      #__cur[data-down]{transform:scale(.7)}
      #__cap{position:fixed;z-index:2147483646;left:50%;bottom:22px;transform:translate(-50%,12px);max-width:min(960px,92vw);
        padding:12px 20px;border-radius:10px;background:#faf9f6;color:#1f1f24;font:600 17px/1.35 "Archivo Variable",system-ui,sans-serif;
        text-align:center;opacity:0;pointer-events:none;transition:opacity .35s,transform .35s;box-shadow:0 10px 30px rgba(0,0,0,.55)}
      #__cap[data-on]{opacity:1;transform:translate(-50%,0)}`;
    const root = document.createElement("div");
    root.id = "__demo";
    root.innerHTML = '<div id="__cur" style="display:none"></div><div id="__cap"></div>';
    document.head.append(style);
    document.body.append(root);
    const cur = root.querySelector("#__cur");
    addEventListener("mousemove", (e) => {
      cur.style.display = "block";
      cur.style.left = e.clientX + "px";
      cur.style.top = e.clientY + "px";
    }, true);
    addEventListener("mousedown", () => cur.setAttribute("data-down", ""), true);
    addEventListener("mouseup", () => cur.removeAttribute("data-down"), true);
    const saved = sessionStorage.getItem("__cap");
    if (saved) {
      const cap = root.querySelector("#__cap");
      cap.textContent = saved;
      cap.setAttribute("data-on", "");
    }
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", draw);
  else draw();
});

const page = await context.newPage();
const t0 = Date.now();
const log = (s) => console.log(`${String(Math.round((Date.now() - t0) / 1000)).padStart(3)}s  ${s}`);

const caption = async (text) => {
  await page.evaluate((t) => {
    const cap = document.getElementById("__cap");
    if (!cap) return;
    if (!t) {
      cap.removeAttribute("data-on");
      sessionStorage.removeItem("__cap");
      return;
    }
    cap.textContent = t;
    cap.setAttribute("data-on", "");
    sessionStorage.setItem("__cap", t);
  }, text);
  log(text ?? "(caption off)");
};
const hold = (ms) => page.waitForTimeout(ms);
const glide = async (locator) => {
  const box = await locator.boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 28 });
  await hold(260);
};
const tap = async (locator) => {
  await glide(locator);
  await locator.click();
};

const cabinet = page.getByRole("region", { name: "Production lines" });
const nav = page.getByRole("navigation", { name: "Main" });

try {
  // 1 — the floor, starting up
  await page.goto(BASE + "/");
  await cabinet.waitFor();
  await page.mouse.move(700, 450);
  await caption("Four production lines on one screen, live. Cards move station by station as the factory works.");
  await hold(6500);

  // 2 — a question the factory cannot decide
  const plate = cabinet.locator('article[aria-label*="needs you first"]');
  await plate.waitFor({ timeout: 90_000 });
  await caption("When it cannot decide, it asks — on the card itself, with the recommended answer first.");
  await glide(plate.getByRole("button", { name: /^A · / }));
  await hold(2800);
  await plate.getByRole("button", { name: /^A · / }).click();
  await hold(900);
  await caption("The click shows at once ('Resuming…') and clears the moment the engine confirms it.");
  await hold(3800);

  // 3 — a pull request waiting at the merge gate
  const merge = cabinet.getByRole("button", { name: "Merge", exact: true }).first();
  await merge.waitFor({ timeout: 120_000 });
  await caption("A pull request waits for you. If the review had doubts, they sit right beside Merge.");
  await glide(merge);
  await hold(3200);
  await merge.click();
  await hold(1200);
  await caption("Merge. It lands, and the run moves to 'Recently finished'.");
  await hold(3600);
  await page.evaluate(() => window.scrollBy({ top: 320, behavior: "smooth" }));
  await hold(2600);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await hold(900);

  // 4 — one line in depth
  await tap(cabinet.getByRole("link", { name: "tidepool-mobile", exact: true }));
  await page.getByRole("heading", { name: "tidepool-mobile", level: 1 }).waitFor();
  await caption("Open a line: its stations and timings, the live log, the tech lead, how it is set up.");
  await hold(7000);

  // 5 — the board, and a new card with pickup's verdict
  await tap(nav.getByRole("link", { name: "Board" }));
  await page.getByRole("tab", { name: "harbour-ledger" }).waitFor();
  await tap(page.getByRole("tab", { name: "harbour-ledger" }));
  await hold(1500);
  await caption("The board, from the tracker. Writing a card? Pickup tells you if it would take it — while you type.");
  await tap(page.getByRole("button", { name: "New card" }));
  const form = page.getByRole("dialog", { name: "New card" });
  await form.waitFor();
  await tap(form.getByLabel("Title"));
  await page.keyboard.type("Show the counterparty's VAT number on the export", { delay: 38 });
  await hold(900);
  await tap(form.getByLabel(/Objective/));
  await page.keyboard.type("Finance needs the VAT number on every exported line.", { delay: 30 });
  await tap(form.getByLabel("Criterion 1"));
  await page.keyboard.type("each CSV row carries the counterparty's VAT number", { delay: 30 });
  await hold(3600);
  await tap(form.getByRole("button", { name: "Cancel" }));
  await hold(800);

  // 6 — the product room
  await tap(nav.getByRole("link", { name: "Product" }));
  // The room opens on the first product; this tour is about the one with requirements written.
  await page.goto(BASE + "/product/harbour-ledger");
  const box = page.getByLabel(/^Message /);
  await box.waitFor();
  await page.getByText("Finance can download the week's reconciled lines").waitFor();
  await caption("The product room: say what you need in plain words.");
  await tap(box);
  await page.keyboard.type("I need the weekly export to include the counterparty's VAT number.", { delay: 34 });
  await hold(500);
  await page.keyboard.press("Enter");
  await caption("It drafts a proposal. Nothing is written until you confirm.");
  const waiting = page.getByRole("group", { name: "Waiting for your answer" });
  await waiting.waitFor({ timeout: 20_000 });
  await hold(3600);
  await tap(waiting.getByRole("button", { name: "Confirm and record" }));
  await hold(3000);

  // 7 — spend
  await tap(nav.getByRole("link", { name: "Costs" }));
  await page.getByRole("heading", { name: "Costs", level: 1 }).waitFor();
  await caption("Spend, autonomy and the knowledge-map A/B — drawn without a chart library, nothing loaded from other hosts.");
  await hold(5500);

  // 8 — find anything
  await caption("Ctrl K finds any card, line or action.");
  await page.keyboard.press("Control+K");
  await page.getByPlaceholder(/Find a card/).waitFor();
  await hold(700);
  await page.keyboard.type("reconc", { delay: 110 });
  await hold(2600);
  await page.keyboard.press("Escape");
  await hold(500);

  // 9 — back to the floor, light theme and back
  await tap(page.getByRole("link", { name: "BeeverForge — the floor" }));
  await cabinet.waitFor();
  await caption("Dark by default, with a light theme.");
  await tap(page.getByRole("button", { name: "Switch to the light theme" }));
  await hold(3200);
  await tap(page.getByRole("button", { name: "Switch to the dark theme" }));
  await hold(1200);
  await caption("panel-next — a React proof of concept, built only on the public API. Beside the default panel, on the same floor.");
  await hold(4800);
  await caption(null);
  await hold(600);
} finally {
  const video = page.video();
  await context.close();
  const file = await video.path();
  const target = join(out, "panel-next-demo.webm");
  renameSync(file, target);
  rmSync(tmp, { recursive: true, force: true });
  await browser.close();
  log(`saved ${target}`);
}
