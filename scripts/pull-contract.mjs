// Copies the core's API contract at one commit into contract/, and records the commit in
// contract/core-ref. The argument may be a commit, a tag or a branch; what is recorded is always the
// commit it resolved to, so the copy can be repeated.
//
//   npm run contract:pull -- [ref]     (default: main)
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CORE = "BeeverForge/beeverforge-oss";
const FILES = {
  "openapi.json": "docs/reference/openapi.json",
  "events.schema.json": "docs/reference/events.schema.json",
};

const here = dirname(fileURLToPath(import.meta.url));
const contract = resolve(here, "../contract");
const ref = process.argv[2] ?? "main";

async function get(url, accept) {
  const res = await fetch(url, { headers: { accept, "user-agent": "beeverforge-panel" } });
  if (!res.ok) {
    console.error(`could not read ${url}: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  return res;
}

const commit = await (
  await get(`https://api.github.com/repos/${CORE}/commits/${encodeURIComponent(ref)}`, "application/vnd.github.sha")
).text();
if (!/^[0-9a-f]{40}$/.test(commit)) {
  console.error(`the core's ${ref} did not resolve to a commit: ${commit.slice(0, 80)}`);
  process.exit(1);
}

for (const [name, path] of Object.entries(FILES)) {
  const body = Buffer.from(
    await (await get(`https://raw.githubusercontent.com/${CORE}/${commit}/${path}`, "*/*")).arrayBuffer(),
  );
  await writeFile(resolve(contract, name), body);
  console.log(`contract/${name} <- ${path} at ${commit.slice(0, 12)}`);
}
await writeFile(resolve(contract, "core-ref"), `${commit}\n`);
console.log(`contract/core-ref = ${commit}`);
