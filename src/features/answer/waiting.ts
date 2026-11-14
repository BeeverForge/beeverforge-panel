// How long something has waited for a person. The engine stamps `parked_at` on a park; a merge
// gate carries no time of its own, so its wait is read from the run's journal: the moment the run
// entered the state it is in. With neither, the screen says the server did not say.
import { useQuery } from "@tanstack/react-query";
import { q } from "../../api/queries";
import type { JournalEvent } from "../../api/types";

export interface Waited {
  at: number | null;
  from: "server" | "journal" | "none";
}

/** When the run entered the state it holds now: its newest `state` line. */
export function enteredAt(events: JournalEvent[] | undefined): number | null {
  if (!events?.length) return null;
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]!;
    if (e.kind === "state" && e.ts) return new Date(e.ts).getTime();
  }
  return null;
}

function stamped(parkedAt: unknown): number | null {
  if (typeof parkedAt !== "string" || !parkedAt) return null;
  const t = new Date(parkedAt).getTime();
  return Number.isFinite(t) ? t : null;
}

/** From what the caller already holds: the park's stamp, else the journal lines on screen. */
export function waitedFrom(parkedAt: unknown, events: JournalEvent[] | undefined): Waited {
  const server = stamped(parkedAt);
  if (server) return { at: server, from: "server" };
  const journal = enteredAt(events);
  return journal ? { at: journal, from: "journal" } : { at: null, from: "none" };
}

/** The same, reading the run's journal only when the park carries no stamp. */
export function useWaited(project: string, issue: string, parkedAt: unknown): Waited {
  const server = stamped(parkedAt);
  const log = useQuery({ ...q.jobEvents(project, issue), enabled: !server && Boolean(project && issue), staleTime: 15_000 });
  if (server) return { at: server, from: "server" };
  return waitedFrom(null, log.data);
}
