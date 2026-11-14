// Everything that waits on a person, across every line, with its answers on it. The same answers
// the red plates carry; here they are in one column so nothing that needs you is off screen.
import { Link } from "@tanstack/react-router";
import type { EngineJob, InboxItem } from "../../api/types";
import { duration, useNow } from "../../live/clock";
import { Dot, Note, Skeleton } from "../../ui/Button";
import { Answers, KICKER, kindOf, questionOf, type NeedKind } from "../answer/Answers";
import s from "./needs.module.css";

export function NeedsYou({ items, jobs, error, loading }: { items: InboxItem[] | undefined; jobs: EngineJob[]; error: unknown; loading: boolean }) {
  const count = items?.length ?? 0;
  return (
    <aside className={s.col} aria-labelledby="needs-title">
      <h2 id="needs-title" className={s.title}>
        Needs you
        <span className={s.count} data-some={count > 0} aria-label={`${count} waiting`}>
          {count > 0 && <Dot tone="alarm" />}
          {loading ? "…" : count}
        </span>
      </h2>
      {loading ? (
        <div className={s.item} aria-hidden="true">
          <Skeleton w="60%" h={12} />
          <Skeleton w="90%" h={14} style={{ marginTop: 10 }} />
          <Skeleton w="50%" h={26} style={{ marginTop: 14 }} />
        </div>
      ) : items === undefined && error ? (
        <Note tone="alarm" icon="alert">
          Could not check what needs you — the engine may be unreachable. This is not the same as nothing waiting.
        </Note>
      ) : count === 0 ? (
        <Note>Nothing needs you. The floor asks only when it cannot decide.</Note>
      ) : (
        <ol className={s.list}>
          {items!.map((it) => (
            <Item key={`${it.project}#${it.issue}`} it={it} job={jobs.find((j) => j.project === it.project && j.issue === it.issue && j.status === "running")} />
          ))}
        </ol>
      )}
    </aside>
  );
}

function Item({ it, job }: { it: InboxItem; job?: EngineJob }) {
  const now = useNow();
  const kind = (kindOf(it, job) ?? "impediment") as NeedKind;
  const parked = typeof it.parked_at === "string" ? it.parked_at : undefined;
  return (
    <li className={s.item}>
      <div className={s.top}>
        <Dot tone={kind === "rate_limit" ? "clock" : "alarm"} />
        <Link to="/p/$project" params={{ project: it.project ?? "" }} className={s.who}>
          {it.project} #{it.issue}
        </Link>
        <span className={s.kind}>{KICKER[kind]}</span>
        {parked && <span className={s.when}>{duration(now - new Date(parked).getTime())}</span>}
      </div>
      {it.title && <p className={s.cardTitle}>{it.title}</p>}
      <p className={s.q}>{questionOf(kind, it, job)}</p>
      {it.review?.word && (
        <p className={s.meta} data-level={it.review.level}>
          Review {it.review.word.toLowerCase()} — {it.review.clause}
        </p>
      )}
      {it.accepted?.said && <p className={s.meta}>{it.accepted.said}</p>}
      <Answers project={it.project ?? ""} issue={it.issue ?? ""} kind={kind} need={it} job={job} />
    </li>
  );
}
