// One run, explained: how long, how much, why it is where it is, what the review found, every
// gate and check, and its log. Opened beside the floor, never instead of it.
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { q } from "../../api/queries";
import { duration, money } from "../../live/clock";
import { Dialog } from "../../ui/Dialog";
import { Dot, Note, Skeleton } from "../../ui/Button";
import { LogFeed } from "../logs/LogFeed";
import s from "./line.module.css";

export function RunBriefing({ project, issue, onClose }: { project: string; issue: string; onClose: () => void }) {
  const detail = useQuery(q.jobDetail(project, issue));
  const events = useQuery(q.jobEvents(project, issue));
  const d = detail.data;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} variant="drawer" title={`${project} #${issue}${d?.title ? ` — ${d.title}` : ""}`}>
      {detail.isPending ? (
        <div className={s.brief}>
          <Skeleton w="50%" h={18} />
          <Skeleton w="90%" h={14} />
          <Skeleton w="100%" h={160} />
        </div>
      ) : d?.error ? (
        <Note tone="alarm" icon="alert">
          {d.error}. The run's journal may still have its log: <Link to="/logs/$project/$issue" params={{ project, issue }}>open the log</Link>.
        </Note>
      ) : d ? (
        <div className={s.brief}>
          <dl className={s.facts}>
            <div>
              <dt>State</dt>
              <dd>{(d.state ?? d.status ?? "").replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Took</dt>
              <dd>{duration(d.runtime_ms)}</dd>
            </div>
            <div>
              <dt>Cost</dt>
              <dd>{money(d.cost_usd)}</dd>
            </div>
            <div>
              <dt>Repairs</dt>
              <dd>{d.repair_attempts ?? "—"}</dd>
            </div>
            {d.deploy && (
              <div>
                <dt>Deploy</dt>
                <dd>{d.deploy.replaceAll("_", " ")}</dd>
              </div>
            )}
          </dl>
          {d.why && <p className={s.why}>{d.why}</p>}
          {d.review && (
            <section>
              <h3 className={s.h3}>
                Review — {d.review.decision} {d.review.score != null && `· ${d.review.score}/10`}
              </h3>
              {d.review.summary && <p className={s.sub}>{d.review.summary}</p>}
              {!!d.review.findings?.length && (
                <ul className={s.findings}>
                  {d.review.findings.map((f, i) => (
                    <li key={i} data-sev={f.severity}>
                      <b>{f.severity}</b> {f.description} {f.file && <code>{f.file}</code>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {!!d.gates?.length && (
            <section>
              <h3 className={s.h3}>Gates</h3>
              <ul className={s.gatesList}>
                {d.gates.map((g) => (
                  <li key={g.name}>
                    <Dot tone={g.passed ? "ok" : "alarm"} /> {g.name} {g.passed ? "passed" : "failed"}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!!d.ci_checks?.length && (
            <section>
              <h3 className={s.h3}>CI checks ({d.ci_provider})</h3>
              <ul className={s.gatesList}>
                {d.ci_checks.map((c) => (
                  <li key={c.name}>
                    <Dot tone={c.bucket === "pass" ? "ok" : c.bucket === "fail" ? "alarm" : "run"} /> {c.name} {c.advisory ? "(advisory)" : ""} {c.remedy && <span className={s.sub}>{c.remedy}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!!d.suppressions?.length && (
            <section>
              <h3 className={s.h3}>Suppressions the change adds</h3>
              <ul className={s.findings}>
                {d.suppressions.map((x, i) => (
                  <li key={i}>
                    <b>{x.kind}</b> <code>{x.file}</code> {x.snippet}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className={s.briefLinks}>
            {d.pr_url && (
              <a href={d.pr_url} onClick={onClose}>
                Pull request
              </a>
            )}
            <Link to="/logs/$project/$issue" params={{ project, issue }} onClick={onClose}>
              The full log
            </Link>
            {d.temporal_url && (
              <a href={d.temporal_url} target="_blank" rel="noreferrer">
                In the engine
              </a>
            )}
          </div>
          <section>
            <h3 className={s.h3}>Log</h3>
            {events.isError ? (
              <Note tone="alarm">This run's log could not be read — {(events.error as Error).message}</Note>
            ) : (
              <LogFeed events={(events.data ?? []).slice(-400)} height={320} label={`Log of ${project} #${issue}`} empty={events.isPending ? "Reading the log…" : "No journal for this run on this machine."} />
            )}
          </section>
        </div>
      ) : (
        <Note tone="alarm">{(detail.error as Error | null)?.message ?? "This run could not be read."}</Note>
      )}
    </Dialog>
  );
}
