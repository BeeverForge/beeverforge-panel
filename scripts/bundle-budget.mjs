// Sum the separately gzipped entry and its static imports, not lazy route chunks.
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";

const dist = resolve("dist");
const manifest = JSON.parse(await readFile(resolve(dist, ".vite/manifest.json"), "utf8"));
const entries = Object.keys(manifest).filter((key) => manifest[key].isEntry);
if (entries.length !== 1) throw new Error(`Expected one application entry, found ${entries.length}`);
const visited = new Set();
let total = 0;
async function visit(key) {
  if (visited.has(key)) return;
  visited.add(key);
  const chunk = manifest[key];
  if (!chunk) throw new Error(`Missing manifest entry: ${key}`);
  if (chunk.file.endsWith(".js")) {
    const size = gzipSync(await readFile(resolve(dist, chunk.file)), { level: 9 }).length;
    console.log(`${chunk.file}: ${(size / 1024).toFixed(1)} KiB gzip`);
    total += size;
  }
  for (const dependency of chunk.imports ?? []) await visit(dependency);
}
await visit(entries[0]);
// The entry is about 136 KiB; its eagerly loaded shared chunks bring the baseline to ~158 KiB.
const budget = 165 * 1024;
console.log(`Initial JavaScript: ${(total / 1024).toFixed(1)} / ${budget / 1024} KiB gzip`);
if (total > budget) {
  console.error("Initial JavaScript exceeds its gzip budget.");
  process.exitCode = 1;
}
