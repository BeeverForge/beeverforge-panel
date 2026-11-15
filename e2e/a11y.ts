import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

async function measure(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  return result.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => `${n.target.join(" ")} (${(n.failureSummary ?? "").split("\n").slice(1, 2).join("").trim()})`).join(" | ")}`);
}

/** Serious and critical violations, each with the elements it found — so a failure names them.
 *  A card's text fades in as the factory writes it, and a colour measured halfway through the fade
 *  is not the colour on screen a moment later: a finding is therefore measured again once the
 *  animation has settled, and only one that is still there counts. */
export async function seriousViolations(page: Page) {
  const first = await measure(page);
  if (!first.length) return first;
  await page.waitForTimeout(900);
  return measure(page);
}
