// The kanban post: one row per production line, one pigeonhole per station. A live card sits in
// the slot of the station it is at and travels to the next one when the server says it moved; a
// card that needs a person turns over to its red side, with the answer on it.
import { Link } from "@tanstack/react-router";
import { AnimatePresence, LayoutGroup, m, useReducedMotion } from "motion/react";
import * as Switch from "@radix-ui/react-switch";
import type { JournalEvent } from "../../api/types";
import { STATIONS, nowOf, type Station } from "../../live/pipeline";
import { duration, money, short, useNow } from "../../live/clock";
import { Skeleton, Note, uiStyles } from "../../ui/Button";
import { Icon } from "../../ui/Icon";
import { capitalise } from "../../ui/text";
import { Answers, KICKER, kindOf, questionOf } from "../answer/Answers";
import { usePickup } from "../answer/useAnswer";
import { WaitedFor } from "../answer/WaitedFor";
import { waitedFrom } from "../answer/waiting";
import { placeOf, stationTimes, useLineLog, type Line } from "./model";
import s from "./floor.module.css";

/** Where a station sits among the cabinet's columns (every line shares the eight headers). */
const COL = new Map(STATIONS.map((st, i) => [st.key, i]));
const STREAM_CAP = 4;

export function Cabinet({ lines, loading, error }: { lines: Line[]; loading: boolean; error: unknown }) {
  const reduce = useReducedMotion();
  if (error && !lines.length) {
    return (
      <Note tone="alarm" icon="alert">
        The project list could not be read — this is not evidence that there are none. {(error as Error).message}
      </Note>
    );
  }
  let streamed = 0;
  return (
    <section className={s.cabinet} aria-label="Production lines">
      <div className={s.head} aria-hidden="true">
        <div className={s.headCell}>Line</div>
        {STATIONS.map((st) => (
          <div key={st.key} className={s.headCell} title={st.what}>
            {st.label}
          </div>
        ))}
      </div>
      <LayoutGroup>
        {loading
          ? [0, 1, 2].map((i) => <SkeletonRow key={i} />)
          : lines.map((line) => {
              const stream = Boolean(line.job) && streamed++ < STREAM_CAP;
              return <LineRow key={line.name} line={line} stream={stream} reduce={Boolean(reduce)} />;
            })}
      </LayoutGroup>
      {!loading && !lines.length && (
        <div className={s.emptyRow}>
          <p>No project is registered on this deployment yet.</p>
          <p className={s.dim}>Register one with <code>beeverforge project init &lt;name&gt; &lt;path&gt;</code>, or from New project on the board.</p>
        </div>
      )}
    </section>
  );
}

function SkeletonRow() {
  return (
    <div className={s.row} aria-hidden="true">
      <div className={s.label}>
        <Skeleton w="70%" h={14} />
        <Skeleton w="40%" h={10} style={{ marginTop: 8 }} />
      </div>
      {STATIONS.map((st) => (
        <div key={st.key} className={s.cell}>
          <span className={s.slot} />
        </div>
      ))}
    </div>
  );
}

function LineRow({ line, stream, reduce }: { line: Line; stream: boolean; reduce: boolean }) {
  const { job, stations } = line;
  const events = useLineLog(line.name, job?.issue ?? undefined, stream);
  const position = placeOf(job, stations, events);
  const now = useNow();
  const kind = kindOf(line.need, job);
  const held = Boolean(job && position?.mode === "held" && kind && kind !== "rate_limit");
  const running = Boolean(job && position?.mode === "running" && kind !== "rate_limit");
  // A state that names no station (a run just starting) still puts its card on the line.
  if (position && position.at < 0) position.at = 0;
  const times = stationTimes(events, stations, position?.at);
  const atKey = position ? stations[position.at]?.key : undefined;
  const atCol = atKey ? COL.get(atKey)! : -1;
  const level = line.verdict?.level ?? "unknown";

  const cells: React.ReactNode[] = [];
  for (let c = 0; c < STATIONS.length; c++) {
    const st = STATIONS[c]!;
    if (st.key === "planning" && line.singleAgent) {
      cells.push(
        <div key={st.key} className={`${s.cell} ${s.na}`} title="A single-agent line has no separate planner">
          —
        </div>,
      );
      continue;
    }
    const idx = stations.findIndex((x) => x.key === st.key);
    if (job && position && idx >= 0 && idx < position.at) {
      const t = times.get(idx);
      cells.push(
        <div key={st.key} className={`${s.cell} ${s.done}`}>
          <i className={s.tick} role="img" aria-label={`${st.label} passed`}>
            <Icon name="check" size={11} strokeWidth={2.2} />
          </i>
          {t?.to && <span className={s.took}>{duration(t.to - t.from)}</span>}
        </div>,
      );
      continue;
    }
    if (job && position && idx === position.at) {
      cells.push(
        <div key={st.key} className={s.cell}>
          <Card line={line} events={events} station={st} since={times.get(idx)?.from} now={now} kind={kind} held={held} reduce={reduce} />
        </div>,
      );
      continue;
    }
    if (!job && c === 0) {
      cells.push(
        <div key="idle" className={`${s.cell} ${s.idleCell}`} style={{ gridColumn: `span ${STATIONS.length}` }}>
          <span className={s.idleSlot} data-level={level}>
            {line.verdict?.clause ? capitalise(line.verdict.clause) : "Reading this line…"}
          </span>
        </div>,
      );
      break;
    }
    cells.push(
      <div key={st.key} className={s.cell}>
        <span className={s.slot} />
      </div>,
    );
  }

  // A held card keeps its own slot; what it asks opens beneath the stations, notched under it.
  if (held) {
    cells.push(
      <div key="plate" className={s.drawer} style={{ "--notch": (atCol + 0.5) / STATIONS.length } as React.CSSProperties}>
        <Plate line={line} kind={kind!} atLabel={stations[position!.at]?.label ?? "the start"} events={events} reduce={reduce} />
      </div>,
    );
  }

  const pips = job && position
    ? stations.map((st, i) => ({ key: st.key, label: st.label, state: i < position.at ? "passed" : i > position.at ? "ahead" : held ? "held" : "here" }))
    : null;

  return (
    <div className={s.row} data-held={held || undefined} data-idle={!job || undefined}>
      <LineLabel line={line} atLabel={atKey ? STATIONS[atCol]?.label : undefined} running={running} pips={pips} />
      {cells}
    </div>
  );
}

function LineLabel({ line, atLabel, running, pips }: { line: Line; atLabel?: string; running: boolean; pips: { key: string; label: string; state: string }[] | null }) {
  const pickup = usePickup();
  const enabled = line.row.enabled !== false;
  const level = line.verdict?.level ?? "unknown";
  return (
    <div className={s.label}>
      <Link to="/p/$project" params={{ project: line.name }} className={s.name}>
        {line.name}
      </Link>
      <span className={s.word} data-level={level} data-running={running || undefined}>
        {line.verdict?.short?.toLowerCase() ?? "reading…"}
      </span>
      {line.job && atLabel && (
        <span className={s.where}>
          #{line.job.issue} at {atLabel}
        </span>
      )}
      {pips && (
        // The cabinet's stations in small, for the narrow screen where the slots are folded away.
        <ol className={s.pips} aria-hidden="true">
          {pips.map((p) => (
            <li key={p.key} data-state={p.state} title={p.label} />
          ))}
        </ol>
      )}
      <label className={s.pickup}>
        <Switch.Root
          className={uiStyles.switch}
          checked={enabled}
          disabled={pickup.isPending}
          onCheckedChange={(v) => pickup.mutate({ project: line.name, enabled: v })}
          aria-label={`Pickup for ${line.name}`}
        >
          <Switch.Thumb className={uiStyles.thumb} />
        </Switch.Root>
        <span>{enabled ? "Pickup on" : "Pickup off"}</span>
      </label>
    </div>
  );
}

/** What the card says under its title: the newest line of its log, or the gates as they pass. */
function cardDetail(events: JournalEvent[], stationKey: string) {
  let start = 0;
  events.forEach((e, i) => {
    if (e.kind === "state") start = i;
  });
  const current = events.slice(start + 1);
  if (stationKey === "validating") {
    const gates = current.filter((e) => e.kind === "validation" && e.data?.gate);
    if (gates.length) return { gates: gates.map((g) => ({ name: String(g.data!.gate), passed: Boolean(g.data!.passed) })) };
  }
  const last = [...current].reverse().find((e) => e.kind === "agent_action" || e.kind === "note" || e.kind === "warning" || e.kind === "review");
  return { line: last?.message };
}

function Card({
  line,
  events,
  station,
  since,
  now,
  kind,
  held,
  reduce,
}: {
  line: Line;
  events: JournalEvent[];
  station: Station;
  since?: number;
  now: number;
  kind: ReturnType<typeof kindOf>;
  held: boolean;
  reduce: boolean;
}) {
  const job = line.job!;
  const cost = events.reduce((sum, e) => sum + (typeof e.data?.cost_usd === "number" ? e.data.cost_usd : 0), 0);
  const total = job.start_time ? now - new Date(job.start_time).getTime() : null;
  const here = since ? now - since : null;
  const detail = cardDetail(events, station.key);
  const paused = kind === "rate_limit";
  const merging = job.action?.kind === "merge_wait" && (job.action.auto || job.action.working);
  return (
    <m.article
      layoutId={job.run_id ?? job.workflow_id ?? line.name}
      layout={!reduce}
      transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.9 }}
      className={s.card}
      data-paused={paused || undefined}
      data-held={held || undefined}
      aria-label={`#${job.issue} ${job.title ?? ""}, ${held ? "held" : "at"} ${station.label}`}
    >
      <div className={s.cardTop}>
        <Link to="/p/$project" params={{ project: line.name }} className={s.cardNo}>
          #{job.issue}
        </Link>
        <span>{cost ? money(cost) : ""}</span>
      </div>
      <p className={s.cardTitle}>{job.title || "…"}</p>
      <AnimatePresence mode="popLayout" initial={false}>
        <m.div
          key={detail.line ?? detail.gates?.map((g) => g.name + g.passed).join() ?? station.key}
          className={s.cardDetail}
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          {held && kind ? (
            <span className={s.heldLine}>{KICKER[kind]} · answer below</span>
          ) : paused ? (
            <span className={s.pausedLine}>
              <Icon name="clock" size={11} /> paused — retries by itself
            </span>
          ) : merging ? (
            <span>{job.action?.working ? "a pass is rewriting the pull request" : "merging — waiting for CI"}</span>
          ) : detail.gates ? (
            <span className={s.gates}>
              {detail.gates.map((g) => (
                <span key={g.name} data-passed={g.passed}>
                  {g.name}
                  <Icon name={g.passed ? "check" : "close"} size={10} strokeWidth={2.4} />
                  <span className="sr-only">{g.passed ? "passed" : "failed"}</span>
                </span>
              ))}
            </span>
          ) : (
            <span>{detail.line ?? nowOf(job.state)}</span>
          )}
        </m.div>
      </AnimatePresence>
      <div className={s.cardFoot}>
        <span className={s.band} aria-hidden="true" />
        <span title="time at this station">{short(here)}</span>
        <span className={s.cardTotal} title="time since the run started">
          / {short(total)}
        </span>
      </div>
      {paused && <Answers project={line.name} issue={job.issue ?? ""} kind="rate_limit" need={line.need} job={job} />}
    </m.article>
  );
}

function Plate({ line, kind, atLabel, events, reduce }: { line: Line; kind: NonNullable<ReturnType<typeof kindOf>>; atLabel: string; events: JournalEvent[]; reduce: boolean }) {
  const job = line.job!;
  const now = useNow();
  const waited = waitedFrom(line.need?.parked_at ?? job.action?.parked_at, events);
  const review = line.need?.review;
  // Only the oldest ask is turned over to red; the rest wait on their stock with a red band, so
  // the reversed plate always means "this one first".
  const reversed = line.first;
  return (
    <m.article
      initial={reduce ? false : { rotateX: -70, opacity: 0.6 }}
      animate={{ rotateX: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={s.plate}
      data-reversed={reversed}
      aria-label={`#${job.issue} needs you${reversed ? " first" : ""}: ${KICKER[kind]}`}
    >
      <div className={s.plateTop}>
        <span>
          <b>{KICKER[kind]}</b> · #{job.issue} {job.title}
        </span>
        <span className={s.plateWhen}>
          held at {atLabel} · <WaitedFor waited={waited} now={now} />
        </span>
      </div>
      <p className={s.question}>{questionOf(kind, line.need, job)}</p>
      {kind === "merge" && review?.word && review.clause && (
        <p className={s.verdict} data-level={review.level}>
          {capitalise(review.clause)}
        </p>
      )}
      <Answers project={line.name} issue={job.issue ?? ""} kind={kind} need={line.need} job={job} onPlate={reversed} />
    </m.article>
  );
}
