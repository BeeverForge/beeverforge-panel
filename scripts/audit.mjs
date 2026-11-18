// `npm audit` under the dependency policy (the core's ADR-0059 D3): a high or critical advisory fails.
//
// - The runtime tree (what the bundle is built from) has no exceptions.
// - The development tree (the build, the tests, the linters) may carry a reviewed exception in
//   audit-exceptions.json, for an advisory with no patched version, each with its reason and a date
//   by which it is looked at again. An exception past that date, or for an advisory no longer
//   reported, fails too, so the list cannot outlive its reasons.
//
//   node scripts/audit.mjs
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BLOCKING = new Set(["high", "critical"]);

function audit(extra) {
  // npm is a .cmd on Windows, which only a shell runs; the arguments are this script's own.
  const args = ["audit", "--json", ...extra];
  const out =
    process.platform === "win32"
      ? spawnSync(`npm ${args.join(" ")}`, { encoding: "utf8", shell: true })
      : spawnSync("npm", args, { encoding: "utf8" });
  if (out.error) throw out.error;
  let report;
  try {
    report = JSON.parse(out.stdout);
  } catch {
    process.stderr.write(out.stderr);
    console.error("npm audit gave no report: the registry could not be asked, so nothing is known about the tree");
    process.exit(1);
  }
  if (report.error) {
    console.error(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`);
    process.exit(1);
  }
  return report;
}

/** Every blocking advisory in a report, once each: { id, package, severity, title, url }. */
function advisories(report) {
  const seen = new Map();
  for (const vuln of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vuln.via ?? []) {
      if (typeof via === "string" || !BLOCKING.has(via.severity)) continue;
      const id = via.url?.split("/").pop() ?? String(via.source);
      seen.set(id, { id, package: via.name, severity: via.severity, title: via.title, url: via.url });
    }
  }
  return [...seen.values()];
}

const say = (a) => `${a.severity} ${a.id} in ${a.package}: ${a.title} (${a.url})`;
const failures = [];

const runtime = advisories(audit(["--omit=dev"]));
for (const a of runtime) failures.push(`runtime tree, no exception allowed: ${say(a)}`);

const { exceptions = [] } = JSON.parse(readFileSync(new URL("../audit-exceptions.json", import.meta.url), "utf8"));
const today = new Date().toISOString().slice(0, 10);
const excepted = new Map(exceptions.map((e) => [e.advisory, e]));
const whole = advisories(audit([]));
for (const a of whole) {
  if (runtime.some((r) => r.id === a.id)) continue;
  const e = excepted.get(a.id);
  if (!e) failures.push(`no reviewed exception: ${say(a)}`);
  else if (e.review_by < today) failures.push(`the exception for ${a.id} was to be reviewed by ${e.review_by}: ${say(a)}`);
}
for (const e of exceptions) {
  if (!e.reason?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(e.review_by ?? "")) {
    failures.push(`the exception for ${e.advisory} needs a reason and a review_by date (YYYY-MM-DD)`);
  }
  if (!whole.some((a) => a.id === e.advisory)) {
    failures.push(`the exception for ${e.advisory} names an advisory npm audit no longer reports: remove it`);
  }
}

if (failures.length) {
  console.error(failures.map((f) => `- ${f}`).join("\n"));
  process.exit(1);
}
const held = whole.filter((a) => excepted.has(a.id));
console.log(
  `no high or critical advisory in the runtime tree; ${held.length ? `held by a reviewed exception: ${held.map((a) => `${a.id} (${a.package}, review by ${excepted.get(a.id).review_by})`).join(", ")}` : "none in the development tree either"}`,
);
