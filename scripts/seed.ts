// Fills the rig with the synthetic projects and cards of sim/fixtures.ts, through the public API
// only — the same calls a person makes from the panel.
//
//   npm run rig:seed            (the rig must be serving: npm run rig:serve)
//
// Safe to run again: a project registered as asked changes nothing, and a card whose title is
// already on its board is not created twice.
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PROJECTS, cardBody } from "../sim/fixtures.ts";

const target = process.env.PANEL_TARGET ?? "http://127.0.0.1:8788";
const here = dirname(fileURLToPath(import.meta.url));

async function act(name: string, params: Record<string, unknown>) {
  const res = await fetch(`${target}/api/act/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ params }),
  });
  const out = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
    detail?: string;
    data?: Record<string, unknown>;
  };
  if (!res.ok || out.ok === false) {
    throw new Error(`${name} refused (${res.status}): ${out.detail ?? out.message ?? "no sentence"}`);
  }
  return out;
}

async function read<T>(path: string): Promise<T> {
  const res = await fetch(`${target}${path}`);
  if (!res.ok) throw new Error(`GET ${path} answered ${res.status}`);
  return (await res.json()) as T;
}

function repoDirectory(): string {
  const out = spawnSync(process.execPath, [resolve(here, "rig.mjs"), "repos"], {
    encoding: "utf8",
  });
  if (out.status !== 0) throw new Error(`the rig could not make the repositories: ${out.stderr}`);
  const lines = out.stdout.trim().split(/\r?\n/);
  return lines[lines.length - 1]!.trim();
}

const repos = repoDirectory();
console.log(`repositories in ${repos}`);

for (const project of PROJECTS) {
  const init = await act("project_init", {
    project: project.name,
    repo_path: `${repos}/${project.name}`,
  });
  console.log(`${project.name}: ${String(init.message).split(";")[0]}`);

  const board = await read<{ cards: { ref: string; title: string }[] | null }>(
    `/api/v1/board/${encodeURIComponent(project.name)}`,
  );
  const known = new Set((board.cards ?? []).map((c) => c.title));

  for (const card of project.cards) {
    if (known.has(card.title)) continue;
    const created = await act("card_create", {
      project: project.name,
      title: card.title,
      body: cardBody(card),
      column: card.column,
    });
    const issue = String(created.data?.issue ?? created.data?.ref ?? "").replace(/^#/, "");
    if (card.comment && issue) {
      await act("card_comment", { project: project.name, issue, message: card.comment });
    }
    const where = card.shipped ? "shipped" : card.column;
    console.log(`  ${where.padEnd(8)} #${issue.padEnd(3)} ${card.title}`);
  }

  const res = await fetch(`${target}/api/projects/${encodeURIComponent(project.name)}/enabled`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled: project.pickup }),
  });
  if (!res.ok) throw new Error(`pickup for ${project.name} answered ${res.status}`);
}

const reqs = spawnSync(process.execPath, [resolve(here, "rig.mjs"), "requirements"], { encoding: "utf8" });
process.stdout.write(reqs.stdout);
if (reqs.status !== 0) throw new Error(`the requirements could not be committed: ${reqs.stderr}`);

console.log("seeded. Start the simulator and the panel with: npm start");
