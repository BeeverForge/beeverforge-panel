// Every run's log, from the journals on disk — including runs the engine has long forgotten.
// A run still going streams; a finished one is read once. Both are searchable and linkable.
import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "../../api/queries";
import { useEngine } from "../../live/useLiveQueries";
import { useJobLog } from "../../live/jobLog";
import { ago, money, useNow } from "../../live/clock";
import { Dot, Note, Skeleton } from "../../ui/Button";
import { LogFeed } from "./LogFeed";
import s from "./logs.module.css";

const CAP = 400;

export function LogsPage() {
  const params = useParams({ strict: false }) as { project?: string; issue?: string };
  const project = params.project ?? "";
  const issue = params.issue ?? "";
  const journal = useQuery(q.journal());
  const now = useNow();
  const [find, setFind] = useState("");
  const [state, setState] = useState("");

  const rows = (journal.data ?? []).filter((j) => !project || j.project === project);
  const states = [...new Set(rows.map((r) => r.state ?? ""))].filter(Boolean).sort();
  const term = find.trim().toLowerCase();
  const shown = rows.filter((r) => (!state || r.state === state) && (!term || `${r.project} #${r.issue} ${r.state}`.toLowerCase().includes(term)));

  return (
    <div className={s.page}>
      <header className={s.head}>
        <h1>Logs{project ? ` — ${project}` : ""}</h1>
        {project && (
          <Link to="/logs" className={s.all}>
            Every project
          </Link>
        )}
      </header>
      <div className={s.grid}>
        <aside className={s.list} aria-label="Runs">
          <div className={s.filters}>
            <input type="search" placeholder="Find a run" value={find} onChange={(e) => setFind(e.target.value)} aria-label="Find a run" />
            <select value={state} onChange={(e) => setState(e.target.value)} aria-label="Only runs in this state">
              <option value="">Every state</option>
              {states.map((st) => (
                <option key={st} value={st}>
                  {st.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          {journal.isPending ? (
            <div className={s.rows}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} w="100%" h={44} style={{ marginBottom: 6 }} />
              ))}
            </div>
          ) : journal.isError ? (
            <Note tone="alarm">The journals could not be read — {(journal.error as Error).message}</Note>
          ) : !shown.length ? (
            <Note>{rows.length ? "No run matches." : "No run has written a journal on this machine yet."}</Note>
          ) : (
            <ol className={s.rows}>
              {shown.map((r) => {
                const on = r.project === project && r.issue === issue;
                return (
                  <li key={`${r.project}#${r.issue}`}>
                    <Link to="/logs/$project/$issue" params={{ project: r.project ?? "", issue: r.issue ?? "" }} className={s.row} aria-current={on ? "page" : undefined}>
                      <span className={s.rowTop}>
                        <b>
                          {r.project} #{r.issue}
                        </b>
                        <span>{ago(r.updated, now)}</span>
                      </span>
                      <span className={s.rowSub}>
                        <Dot tone={r.state === "merged" || r.state === "done" ? "ok" : /hold|fail|refine/.test(r.state ?? "") ? "alarm" : "run"} />
                        {(r.state ?? "").replaceAll("_", " ")} · {r.events ?? 0} lines · {money(r.cost_usd)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </aside>
        <section className={s.detail}>{issue ? <RunLog project={project} issue={issue} /> : <Note>Choose a run on the left to read its log.</Note>}</section>
      </div>
    </div>
  );
}

function RunLog({ project, issue }: { project: string; issue: string }) {
  const engine = useEngine();
  const live = (engine.data?.jobs ?? []).some((j) => j.project === project && j.issue === issue && j.status === "running");
  const stream = useJobLog(project, issue, live);
  const read = useQuery({ ...q.jobEvents(project, issue), enabled: !live });
  const [find, setFind] = useState("");
  const [all, setAll] = useState(false);
  const events = live ? stream.events : (read.data ?? []);
  const shown = all ? events : events.slice(-CAP);
  return (
    <>
      <div className={s.detailHead}>
        <div>
          <h2>
            {project} #{issue}
          </h2>
          <p className={s.sub}>
            {live ? (stream.link === "live" ? "Running — streaming as it is written" : "Running — connecting to its log") : "Finished — read from its journal"}
            {" · "}
            <Link to="/p/$project" params={{ project }}>
              its line
            </Link>
          </p>
        </div>
        <input type="search" placeholder="Find in this log" value={find} onChange={(e) => setFind(e.target.value)} aria-label="Find in this log" className={s.find} />
      </div>
      {!live && read.isError ? (
        <Note tone="alarm">This run's log could not be read — {(read.error as Error).message}. That is not a run that wrote nothing.</Note>
      ) : (
        <>
          {events.length > CAP && !all && (
            <p className={s.sub}>
              Showing the last {CAP} of {events.length} lines.{" "}
              <button type="button" className={s.more} onClick={() => setAll(true)}>
                Show all
              </button>
            </p>
          )}
          <LogFeed events={shown} follow={live} find={find} height="calc(100dvh - 250px)" label={`Log of ${project} #${issue}`} empty={!live && read.isPending ? "Reading the journal…" : "No journal for this run on this machine."} />
        </>
      )}
    </>
  );
}
