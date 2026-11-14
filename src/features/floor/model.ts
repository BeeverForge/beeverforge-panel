// One line per project: what the cabinet draws, assembled from the reads the server answers —
// the projects, the live jobs, each project's floor verdict, what needs a person, and the cockpit
// that says whether a line has a planner. Nothing here decides a verdict; it only places things.
import { useQueries, useQuery } from "@tanstack/react-query";
import { q } from "../../api/queries";
import type { EngineJob, FloorVerdict, InboxItem, JournalEvent, ProjectRow } from "../../api/types";
import { useEngine, useFloor, useInbox, useProjects } from "../../live/useLiveQueries";
import { positionFromLog, positionOf, stationsFor, type Position, type Station } from "../../live/pipeline";
import { useJobLog } from "../../live/jobLog";
import { enteredAt } from "../answer/waiting";

export interface Line {
  name: string;
  row: ProjectRow;
  verdict: FloorVerdict | undefined;
  stations: Station[];
  singleAgent: boolean;
  job: EngineJob | undefined;
  need: InboxItem | undefined;
  /** The oldest ask on the floor — the one the server's sentence names — is the reversed plate. */
  first: boolean;
}

/** A live run's log for a card on screen: streamed while few runs are live, read on change past
 *  that, so the page never holds more connections than a browser allows one origin. */
export function useLineLog(project: string, issue: string | undefined, stream: boolean) {
  const live = useJobLog(project, issue ?? "", stream && Boolean(issue));
  const read = useQuery({ ...q.jobEvents(project, issue ?? ""), enabled: !stream && Boolean(issue), refetchInterval: 8000 });
  return stream ? live.events : (read.data ?? []);
}

export function placeOf(job: EngineJob | undefined, stations: Station[], events: JournalEvent[]): Position | undefined {
  if (!job) return undefined;
  const fromLog = events.length ? positionFromLog(events, stations) : undefined;
  return positionOf(job, stations, fromLog?.at);
}

/** The time each station of the current run took, from its `state` lines; the last one runs on.
 *  A run held at a station by a state that names none (a decision parks as `on_hold`) is timed
 *  at `at` from the moment it entered that state. */
export function stationTimes(events: JournalEvent[] | undefined, stations: Station[], here?: number) {
  const out = new Map<number, { from: number; to: number | null }>();
  if (!events?.length) return out;
  let start = 0;
  events.forEach((e, i) => {
    if (e.kind === "state" && e.message === "spec_validation") start = i;
  });
  const states = events.slice(start).filter((e) => e.kind === "state" && e.ts);
  const at = (state: string) => {
    const key = stationKeyOf(state);
    return key ? stations.findIndex((s) => s.key === key) : -1;
  };
  states.forEach((e, i) => {
    const idx = at(e.message ?? "");
    if (idx < 0) return;
    const from = new Date(e.ts!).getTime();
    const next = states[i + 1];
    const to = next?.ts ? new Date(next.ts).getTime() : null;
    const prev = out.get(idx);
    out.set(idx, { from: prev?.from ?? from, to });
  });
  if (here !== undefined && here >= 0 && !out.has(here)) {
    const entered = enteredAt(events);
    if (entered) out.set(here, { from: entered, to: null });
  }
  return out;
}

const KEY: Record<string, string> = {
  sizing: "spec_validation",
  spec_validation: "spec_validation",
  preparing: "preparing",
  planning: "planning",
  implementing: "implementing",
  validating: "validating",
  repairing: "validating",
  reviewing: "reviewing",
  pr_open: "pr_open",
  merging: "merge",
  awaiting_your_merge: "merge",
};
const stationKeyOf = (state: string) => KEY[state];

export function useLines() {
  const projects = useProjects();
  const engine = useEngine();
  const floor = useFloor();
  const inbox = useInbox();

  const names = (projects.data ?? []).map((p) => p.name ?? "").filter(Boolean);
  const cockpits = useQueries({ queries: names.map((n) => ({ ...q.cockpit(n) })) });

  const jobs = engine.data?.jobs ?? [];
  const live = new Map<string, EngineJob>();
  for (const j of jobs) if (j.status === "running" && j.project) live.set(j.project, j);

  const lines: Line[] = names.map((name, i) => {
    const row = projects.data!.find((p) => p.name === name)!;
    const singleAgent = cockpits[i]?.data?.single_agent ?? true;
    const stations = stationsFor(singleAgent);
    const job = live.get(name);
    const need = inbox.data?.find((it) => it.project === name && it.issue === job?.issue);
    const head = inbox.data?.find((it) => it.kind !== "rate_limit");
    return {
      name,
      row,
      verdict: floor.data?.per_project?.[name],
      stations,
      singleAgent,
      job,
      need,
      first: Boolean(need && head && need === head),
    };
  });

  return {
    lines,
    loading: projects.isPending,
    projectsError: projects.error,
    engine,
    floor,
    inbox,
  };
}

/** Finished runs, newest first: the engine's, then runs only the journals still remember. */
export function useShipped(limit = 6, project?: string) {
  const engine = useEngine();
  const journal = useQuery({ ...q.journal(), staleTime: 15_000 });
  const fromEngine = (engine.data?.jobs ?? []).filter((j) => j.status !== "running" && (!project || j.project === project));
  // Every card the engine still lists — live or finished — is the engine's to describe.
  const seen = new Set((engine.data?.jobs ?? []).map((j) => `${j.project}#${j.issue}`));
  const forgotten = (journal.data ?? [])
    .filter((j) => (!project || j.project === project) && !seen.has(`${j.project}#${j.issue}`))
    .map((j) => ({ project: j.project, issue: j.issue, state: j.state, close_time: j.updated, cost_usd: j.cost_usd, forgotten: true as const }));
  const all = [...fromEngine.map((j) => ({ ...j, forgotten: false as const })), ...forgotten].sort((a, b) =>
    String(b.close_time ?? "").localeCompare(String(a.close_time ?? "")),
  );
  const costs = new Map((journal.data ?? []).map((j) => [`${j.project}#${j.issue}`, j.cost_usd]));
  return { runs: all.slice(0, limit), total: all.length, costs, loading: engine.isPending, journalUnread: Boolean(journal.error) };
}
