// The engine stream (`/api/temporal/stream`): every frame is written into the same query entry a
// read of `/api/v1/temporal/jobs` fills, and the reads the server derives from the jobs — the floor
// sentence, what needs you, the boards — are asked again at once instead of on a timer.
import type { QueryClient } from "@tanstack/react-query";
import { keys } from "../api/queries";
import type { EngineJob, EngineRead } from "../api/types";
import { useLive } from "./status";
import { usePending } from "../features/answer/pending";

/** A frame that omits a key keeps the last one; `jobs: null` keeps the list and marks it unread. */
export function mergeEngineFrame(prev: EngineRead | undefined, frame: EngineRead): EngineRead {
  const kept = prev ?? {};
  return {
    ...frame,
    intake: frame.intake ?? kept.intake,
    build: frame.build ?? kept.build,
    address: frame.address ?? kept.address,
    ui_base: frame.ui_base ?? kept.ui_base,
    jobs: frame.jobs === null || frame.jobs === undefined ? (kept.jobs ?? null) : frame.jobs,
  };
}

const jobKey = (j: EngineJob) => `${j.project}#${j.issue}`;
const jobSig = (j: EngineJob) =>
  JSON.stringify([j.run_id, j.status, j.state, j.action ?? null, j.deploy ?? null, j.wedged ?? false]);

/** The cards whose job changed between two frames. */
export function changedJobs(prev: EngineJob[] | null | undefined, next: EngineJob[] | null | undefined) {
  const before = new Map((prev ?? []).map((j) => [`${j.run_id}`, jobSig(j)]));
  const out = new Set<string>();
  for (const j of next ?? []) if (before.get(`${j.run_id}`) !== jobSig(j)) out.add(jobKey(j));
  return out;
}

export function startEngineStream(client: QueryClient): () => void {
  const live = useLive.getState();
  let source: EventSource | null = null;
  let retry: number | undefined;
  let nudgeTimer: number | undefined;
  const touched = new Set<string>();
  let stopped = false;

  // Many frames can land in one burst; the derived reads are asked once per burst.
  const nudge = () => {
    window.clearTimeout(nudgeTimer);
    nudgeTimer = window.setTimeout(() => {
      void client.invalidateQueries({ queryKey: ["floor"] });
      void client.invalidateQueries({ queryKey: keys.inbox });
      void client.invalidateQueries({ queryKey: keys.journal });
      void client.invalidateQueries({ queryKey: keys.coordinator });
      for (const key of touched) {
        const [project, issue] = key.split("#") as [string, string];
        void client.invalidateQueries({ queryKey: keys.jobDetail(project, issue) });
        void client.invalidateQueries({ queryKey: keys.jobEvents(project, issue) });
        void client.invalidateQueries({ queryKey: ["board", project] });
        void client.invalidateQueries({ queryKey: keys.messages(project) });
      }
      touched.clear();
    }, 120);
  };

  const open = () => {
    if (stopped) return;
    source?.close();
    const es = new EventSource("/api/temporal/stream");
    source = es;
    live.set({ engine: useLive.getState().engineAt ? "reconnecting" : "connecting" });
    es.onopen = () => useLive.getState().set({ engine: "live" });
    es.onmessage = (ev) => {
      let frame: EngineRead;
      try {
        frame = JSON.parse(ev.data) as EngineRead;
      } catch {
        return;
      }
      const prev = client.getQueryData<EngineRead>(keys.engine);
      const merged = mergeEngineFrame(prev, frame);
      for (const k of changedJobs(prev?.jobs, merged.jobs)) {
        touched.add(k);
        // The job moved: whatever this browser asked of it has been heard.
        usePending.getState().clear(k);
      }
      client.setQueryData(keys.engine, merged);
      useLive.getState().set({ engine: "live", engineAt: Date.now(), jobsUnread: frame.jobs === null });
      nudge();
    };
    es.onerror = () => {
      // EventSource reconnects by itself while CONNECTING; CLOSED means it gave up.
      if (es.readyState === EventSource.CLOSED) {
        useLive.getState().set({ engine: "offline" });
        window.clearTimeout(retry);
        retry = window.setTimeout(open, 5000);
      } else {
        useLive.getState().set({ engine: "reconnecting" });
      }
    };
    // The server ended the stream (signed out, not allowed, unavailable): say why, and come back
    // only once a plain read says the floor answers again.
    es.addEventListener("ended", (ev) => {
      es.close();
      let why = "";
      try {
        why = (JSON.parse((ev as MessageEvent).data) as { detail?: string }).detail ?? "";
      } catch {
        /* the event carried no body */
      }
      useLive.getState().set({ engine: "ended", endedWhy: why });
      const probe = async () => {
        if (stopped) return;
        try {
          await client.fetchQuery({ queryKey: keys.floor(""), staleTime: 0 });
          open();
        } catch {
          retry = window.setTimeout(probe, 15_000);
        }
      };
      retry = window.setTimeout(probe, 5000);
    });
  };

  open();
  return () => {
    stopped = true;
    window.clearTimeout(retry);
    window.clearTimeout(nudgeTimer);
    source?.close();
  };
}
