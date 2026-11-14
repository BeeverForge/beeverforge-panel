// Finds and repairs text that was read as Windows-1252 and written back as UTF-8 ("â€”" for "—").
//   node scripts/mojibake.mjs            lists the files
//   node scripts/mojibake.mjs --fix      repairs them in place
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Windows-1252's 0x80–0x9F, the bytes that are not Latin-1.
const CP1252 = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f };
const SIGN = /[\u00c2\u00c3\u00e2][\u0080-\u00bf\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]/;

function repair(text) {
  const bytes = [];
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if (c < 0x100) bytes.push(c);
    else if (CP1252[c] !== undefined) bytes.push(CP1252[c]);
    else return null; // a real non-Latin character: the file is not uniformly mis-decoded
  }
  return Buffer.from(bytes).toString("utf8");
}

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".") || name === "dist") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx?|css|mjs|md|json|html|sh)$/.test(name)) yield p;
  }
}

const fix = process.argv.includes("--fix");
const named = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const self = new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1").replaceAll("/", "\\");
for (const f of named.length ? named : files(process.cwd())) {
  if (f.toLowerCase() === self.toLowerCase() || f.endsWith("mojibake.mjs")) continue;
  const text = readFileSync(f, "utf8");
  if (!SIGN.test(text)) continue;
  const fixed = repair(text);
  console.log(`${f}${fixed === null ? " — mixed, repair by hand" : ""}`);
  if (fix && fixed !== null) writeFileSync(f, fixed);
}
