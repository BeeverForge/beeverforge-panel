// The production line's stations, and where a job is on them. One definition, read by the floor
// grid, the job card and the log, so two surfaces never disagree about where a card is.
import type { EngineJob, JournalEvent } from "../api/types";

export interface Station {
  key: string;
  label: string;
  what: string;
}

/** ADR-0014: a single-agent project has no planner, so `planning` is dropped for it. */
export const STATIONS: Station[] = [
  { key: "spec_validation", label: "Spec", what: "Checks the card has an objective and acceptance criteria" },
  { key: "preparing", label: "Prep", what: "Clones the repository into an isolated box and runs its setup" },
  { key: "planning", label: "Plan", what: "A read-only planner drafts a short, testable plan (two-stage projects)" },
  { key: "implementing", label: "Code", what: "The agent implements the change, tests first" },
  { key: "validating", label: "Test", what: "The project's own gates run: lint, type, security, tests, migrations" },
  { key: "reviewing", label: "Review", what: "An independent agent reviews the diff" },
  { key: "pr_open", label: "PR", what: "The pull request is opened" },
  { key: "merge", label: "Merge", what: "The pull request lands — by policy, or when you merge it" },
];

export const stationsFor = (singleAgent: boolean) =>
  singleAgent ? STATIONS.filter((s) => s.key !== "planning") : STATIONS;

/** The station a live state stands at; `null` for a state that says nothing about position. */
const STATE_AT: Record<string, string> = {
  sizing: "spec_validation",
  splitting: "spec_validation",
  spec_validation: "spec_validation",
  needs_refinement: "spec_validation",
  preparing: "preparing",
  planning: "planning",
  implementing: "implementing",
  validating: "validating",
  repairing: "validating",
  reviewing: "reviewing",
  pr_open: "pr_open",
  merging: "merge",
  awaiting_your_merge: "merge",
  merged: "merge",
  awaiting_prod_approval: "merge",
  prod_releasing: "merge",
  done: "merge",
};

export type Mode = "running" | "held" | "failed" | "shipped";

export interface Position {
  /** Index into the project's stations, or -1 before the first. */
  at: number;
  mode: Mode;
}

const SHIPPED = new Set(["merged", "done", "awaiting_prod_approval", "prod_releasing"]);

/** Where a job stands, from its engine row alone (no log needed). */
export function positionOf(job: EngineJob, stations: Station[], lastKnown?: number): Position {
  const state = job.state ?? "";
  const held = Boolean(job.attention) || (job.action && job.action.kind !== "merge_wait") || job.wedged;
  const key = STATE_AT[state] ?? (job.action?.decision?.stage ? STATE_AT[job.action.decision.stage] : undefined);
  const at = key ? stations.findIndex((s) => s.key === key) : (lastKnown ?? -1);
  if (job.status !== "running") {
    if (SHIPPED.has(state)) return { at: stations.length - 1, mode: "shipped" };
    return { at, mode: "failed" };
  }
  if (state === "awaiting_your_merge") return { at, mode: "held" };
  return { at, mode: held ? "held" : "running" };
}

/** Where the last run in a journal reached, read from its `state` lines. A run restarts its strip
 *  at `spec_validation`, so a re-run never shows the earlier run's ticks. */
export function positionFromLog(events: JournalEvent[], stations: Station[]): Position & { cost: number; credential?: string } {
  let at = -1;
  let mode: Mode = "running";
  let cost = 0;
  let credential: string | undefined;
  for (const e of events) {
    if (typeof e.data?.cost_usd === "number") cost += e.data.cost_usd;
    if (e.kind === "note" && e.data?.credential) {
      const c = e.data.credential;
      credential = `${c.index}/${c.total}${c.id ? ` (${c.id})` : ""}${c.rotated ? " ↻" : ""}`;
    }
    if (e.kind !== "state") continue;
    const state = e.message ?? "";
    if (state === "spec_validation") {
      at = -1;
      mode = "running";
    }
    const key = STATE_AT[state];
    const idx = key ? stations.findIndex((s) => s.key === key) : -1;
    if (idx >= 0) at = Math.max(at, idx);
    if (state === "failed" || state === "needs_refinement" || state === "on_hold") mode = state === "on_hold" ? "held" : "failed";
    else if (SHIPPED.has(state)) mode = "shipped";
    else if (idx >= 0) mode = "running";
  }
  return { at, mode, cost: Number(cost.toFixed(2)), credential };
}

/** What a state means, in a sentence a newcomer can read. */
export const NOW: Record<string, string> = {
  sizing: "Sizing the card — is it one small, testable change?",
  splitting: "Splitting the card into smaller ones",
  spec_validation: "Checking the card has an objective and acceptance criteria",
  preparing: "Cloning the repository and preparing the box",
  planning: "Planning — drafting a short, testable plan",
  implementing: "Coding — writing the tests, then the change",
  validating: "Running the project's gates",
  repairing: "Repairing — fixing what a gate found",
  reviewing: "An independent agent is reviewing the diff",
  pr_open: "Pull request opened",
  merging: "Merging — waiting for CI",
  awaiting_your_merge: "The pull request is ready and waits for your review",
  merged: "Merged",
  done: "Released",
  needs_refinement: "Sent back — the card needs acceptance criteria",
  on_hold: "On hold — needs a person",
  paused: "Paused on a usage limit — it retries by itself",
  awaiting_prod_approval: "Waiting for your production approval",
  prod_releasing: "Releasing to production",
  running: "Running",
  skipped: "Skipped — the card went back to Backlog",
  failed: "Stopped",
};

export const nowOf = (state?: string | null) => (state ? (NOW[state] ?? state.replaceAll("_", " ")) : "");
