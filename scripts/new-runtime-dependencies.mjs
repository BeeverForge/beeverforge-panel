// A runtime dependency a pull request adds states its reason in the pull request (the core's
// ADR-0059 D3). Compares package.json's `dependencies` with the base, and asks the pull request's
// description to name each new package under its "New runtime dependencies" heading.
//
//   BASE_SHA=<base commit> PR_BODY="<description>" node scripts/new-runtime-dependencies.mjs
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const base = process.env.BASE_SHA;
if (!base) {
  console.error("BASE_SHA is not set: nothing to compare package.json with");
  process.exit(2);
}
const before = JSON.parse(execFileSync("git", ["show", `${base}:package.json`], { encoding: "utf8" })).dependencies ?? {};
const after = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).dependencies ?? {};
const added = Object.keys(after).filter((name) => !(name in before));
if (!added.length) {
  console.log("no new runtime dependency");
  process.exit(0);
}

const body = (process.env.PR_BODY ?? "").replace(/\r\n/g, "\n");
const section = body.match(/^#{2,3} New runtime dependencies\s*\n([\s\S]*?)(?=^#{1,3} |(?![\s\S]))/m)?.[1] ?? "";
const unexplained = added.filter((name) => {
  const line = section.split("\n").find((l) => l.includes(name));
  return !line || line.replace(name, "").replace(/[-*`:\s]/g, "").length < 10;
});
if (unexplained.length) {
  console.error(`this pull request adds runtime dependencies with no reason given: ${unexplained.join(", ")}`);
  console.error('Under "## New runtime dependencies" in its description, name each one and say why it is needed.');
  process.exit(1);
}
console.log(`new runtime dependencies, each with its reason: ${added.join(", ")}`);
