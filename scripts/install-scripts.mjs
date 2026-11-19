// The install scripts of the dependency tree, under the dependency policy (the core's ADR-0059 D3).
// .npmrc blocks every install script; the ones reviewed in package.json's `allowScripts` are run
// here, by name, after `npm ci`.
//
//   node scripts/install-scripts.mjs run      run the reviewed install scripts (npm run setup does)
//   node scripts/install-scripts.mjs check    fail when a package has an install script nobody reviewed
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// npm is a .cmd on Windows, which only a shell runs; the arguments are this script's own.
function npmRun(args) {
  const out =
    process.platform === "win32"
      ? spawnSync(`npm ${args.join(" ")}`, { encoding: "utf8", shell: true })
      : spawnSync("npm", args, { encoding: "utf8" });
  if (out.error) throw out.error;
  return out;
}

const mode = process.argv[2];
if (mode === "run") {
  const allowed = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).allowScripts ?? {};
  const names = Object.entries(allowed).filter(([, ok]) => ok === true).map(([k]) => k);
  // Keep the reviewed version pin when rebuilding. Reject shell metacharacters on Windows.
  if (names.some((name) => !/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+@\d+\.\d+\.\d+$/.test(name))) {
    console.error("allowScripts entries must be package names pinned to exact versions");
    process.exit(1);
  }
  if (!names.length) {
    console.log("no install script is allowed; nothing to run");
    process.exit(0);
  }
  const out = npmRun(["rebuild", ...names, "--ignore-scripts=false"]);
  process.stdout.write(out.stdout);
  process.stderr.write(out.stderr);
  if (out.status !== 0) process.exit(out.status ?? 1);
  console.log(`ran the reviewed install scripts of: ${names.join(", ")}`);
} else if (mode === "check") {
  const out = npmRun(["approve-scripts", "--allow-scripts-pending", "--json"]);
  if (out.status !== 0) {
    process.stderr.write(out.stderr);
    console.error("could not list the install scripts nobody reviewed (npm approve-scripts needs npm 11.17 or later)");
    process.exit(1);
  }
  const pending = JSON.parse(out.stdout).allowScripts ?? [];
  if (pending.length) {
    console.error("these packages have install scripts nobody reviewed:");
    for (const p of pending) console.error(`  ${p.name}: ${p.changes.map((c) => c.key).join(", ")}`);
    console.error("Read the script, then `npm approve-scripts <pkg>` or `npm deny-scripts <pkg>`, and say why in the pull request.");
    process.exit(1);
  }
  console.log("every install script in the tree is reviewed in allowScripts");
} else {
  console.error("usage: node scripts/install-scripts.mjs run|check");
  process.exit(2);
}
