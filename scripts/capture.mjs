// Captures the review screenshots at exactly their viewport's width (scrollbars hidden, so a
// full-page image is never cut by the scrollbar's width). Needs the panel running (npm start).
//
//   node scripts/capture.mjs [out-dir] [only-files-containing]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.PANEL_URL ?? "http://127.0.0.1:5173";
const out = process.argv[2] ?? ".impeccable/review";
const only = process.argv[3] ?? "";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ["--hide-scrollbars"] });
const shots = [
  { file: "desktop.png", path: "/", width: 1440, height: 900, full: true },
  { file: "mobile.png", path: "/", width: 390, height: 844, full: true, mobile: true },
  { file: "light.png", path: "/", width: 1440, height: 900, light: true },
  { file: "line.png", path: "/p/tidepool-mobile", width: 1440, height: 900, full: true },
  { file: "line-mobile.png", path: "/p/tidepool-mobile", width: 390, height: 844, full: true, mobile: true },
  { file: "board.png", path: "/p/harbour-ledger/board", width: 1440, height: 900 },
  { file: "product.png", path: "/product/harbour-ledger", width: 1440, height: 900 },
  { file: "product-mobile.png", path: "/product/harbour-ledger", width: 390, height: 844, mobile: true },
  { file: "costs.png", path: "/costs?project=quarry-api", width: 1440, height: 900 },
  { file: "logs.png", path: "/logs/harbour-ledger", width: 1440, height: 900 },
];

for (const s of shots.filter((x) => x.file.includes(only))) {
  const context = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: 1,
    isMobile: Boolean(s.mobile),
    hasTouch: Boolean(s.mobile),
  });
  if (s.light) await context.addInitScript(() => localStorage.setItem("bf_theme", "light"));
  const page = await context.newPage();
  await page.goto(BASE + s.path);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/${s.file}`, fullPage: Boolean(s.full) });
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  console.log(`${s.file}: layout ${width}px wide`);
  await context.close();
}
await browser.close();
