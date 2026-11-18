// Measures the default panel and this one on the same live floor, for COMPARISON.md:
// the page's size, the API requests each makes in a minute of steady state, and axe's serious and
// critical findings. Needs the rig, the simulator and the panel running (npm start).
//
//   node scripts/compare.mjs
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { gzipSync } from "node:zlib";

const OLD = process.env.OLD_URL ?? "http://127.0.0.1:8790";
const NEW = process.env.PANEL_URL ?? "http://127.0.0.1:5173";
const WINDOW_MS = Number(process.env.WINDOW_MS ?? 60_000);

// The default panel's page as the rig's API serves it, so the size is the one a browser downloads.
const html = Buffer.from(await (await fetch(`${OLD}/`)).arrayBuffer());
console.log(`default panel page: ${(html.length / 1024).toFixed(0)} KB, ${(gzipSync(html).length / 1024).toFixed(0)} KB gzip`);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

for (const [label, url] of [
  ["default floor", `${OLD}/`],
  ["new floor", `${NEW}/`],
  ["default line", `${OLD}/p/tidepool-mobile`],
  ["new line", `${NEW}/p/tidepool-mobile`],
]) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  const r = await new AxeBuilder({ page }).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  console.log(`${label}: axe serious/critical — ${bad.length ? bad.map((v) => `${v.id} ×${v.nodes.length}`).join(", ") : "none"}`);

  const seen = [];
  const onRequest = (req) => req.url().includes("/api/") && seen.push(new URL(req.url()).pathname);
  page.on("request", onRequest);
  await page.waitForTimeout(WINDOW_MS);
  page.off("request", onRequest);
  const by = {};
  for (const p of seen) by[p] = (by[p] ?? 0) + 1;
  console.log(`${label}: ${seen.length} API requests in ${WINDOW_MS / 1000}s`, by);
}
await browser.close();
