// One production line in depth: where its card is and what it is doing this second, what it
// asks of you, its live log, how it is set up, and every run it finished.
import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import * as Switch from "@radix-ui/react-switch";
import { q } from "../../api/queries";
import { useEngine, useFloor, useInbox, useProjects } from "../../live/useLiveQueries";
import { useFollowProject } from "../../live/LiveProvider";
import { useJobLog } from "../../live/jobLog";
import { nowOf, positionFromLog, stationsFor } from "../../live/pipeline";
import { ago, duration, money, useNow } from "../../live/clock";
import { Button, Dot, Note, Skeleton, uiStyles } from "../../ui/Button";
import { Icon } from "../../ui/Icon";
import { capitalise, Said } from "../../ui/text";
import { Answers, KICKER, kindOf, questionOf } from "../answer/Answers";
import { WaitedFor } from "../answer/WaitedFor";
import { waitedFrom } from "../answer/waiting";
import { usePickup, useScan } from "../answer/useAnswer";
import { placeOf, stationTimes } from "../floor/model";
import { LogFeed } from "../logs/LogFeed";
import { StationStrip } from "./StationStrip";
import { TechLead } from "./TechLead";
import { RunBriefing } from "./RunBriefing";
import s from "./line.module.css";

export function LinePage() {
  const { project } = useParams({ from: "/p/$project" });
  useFollowProject(project);
  const projects = useProjects();
  const row = projects.data?.find((p) => p.name === project);
  const floor = useFloor(project);
  const engine = useEngine();
  const inbox = useInbox();
  const cockpit = useQuery(q.cockpit(project));
  const pickup = usePickup();
  const scan = useScan();
  const [brief, setBrief] = useState<string | null>(null);

  const singleAgent = cockpit.data?.single_agent ?? true;
  const stations = stationsFor(singleAgent);
  const jobs = (engine.data?.jobs ?? []).filter((j) => j.project === project);
  const job = jobs.find((j) => j.status === "running");
  const log = useJobLog(project, job?.issue ?? "", Boolean(job?.issue));
  const position = placeOf(job, stations, log.events);
  const times = stationTimes(log.events, stations, position?.at);
  const fromLog = positionFromLog(log.events, stations);
  const need = inbox.data?.find((it) => it.project === project && it.issue === job?.issue);
  const kind = kindOf(need, job);
  const now = useNow();
  const enabled = row?.enabled !== false;
  const f = floor.data;

  if (projects.isSuccess && !row) {
    return (
      <Note tone="alarm" icon="alert">
        No project named “{project}” is registered here. <Link to="/">Back to the floor</Link>.
      </Note>
    );
  }

  return (
    <div className={s.page}>
      <nav className={s.crumbs} aria-label="Breadcrumb">
        <Link to="/">Floor</Link>
        <Icon name="chevronRight" size={12} />
        <span aria-current="page">{project}</span>
      </nav>

      <header className={s.header}>
        <div>
          <h1 className={s.title}>{project}</h1>
          <p className={s.verdict} data-level={f?.level ?? "unknown"}>
            {floor.isPending ? <Skeleton w={300} h={14} /> : f ? <><b>{f.word}</b> — {f.clause}</> : "This line's verdict could not be read."}
          </p>
        </div>
        <div className={s.headerActions}>
          <label className={s.pickup}>
            <Switch.Root className={uiStyles.switch} checked={enabled} disabled={pickup.isPending || !row} onCheckedChange={(v) => pickup.mutate({ project, enabled: v })} aria-label={`Pickup for ${project}`}>
              <Switch.Thumb className={uiStyles.thumb} />
            </Switch.Root>
            {enabled ? "Pickup on" : "Pickup off"}
          </label>
          {!job && (
            <Button icon="scan" busy={scan.isPending} onClick={() => scan.mutate(project)} title="Read this line's TO-DO now instead of waiting for the next pickup">
              Pick up the next card now
            </Button>
          )}
          <Link to="/p/$project/board" params={{ project }} className={s.headerLink}>
            <Icon name="board" size={14} /> Board
          </Link>
          <Link to="/logs/$project" params={{ project }} className={s.headerLink}>
            <Icon name="logs" size={14} /> Logs
          </Link>
          <Link to="/costs" search={{ project }} className={s.headerLink}>
            <Icon name="costs" size={14} /> Costs
          </Link>
        </div>
      </header>

      <div className={s.grid}>
        <div className={s.main}>
          <section className={s.live} aria-labelledby="live-title">
            {engine.isPending ? (
              <div className={s.liveHead}>
                <Skeleton w="45%" h={20} />
                <Skeleton w="100%" h={64} style={{ marginTop: 14 }} />
              </div>
            ) : job ? (
              <>
                <div className={s.liveHead}>
                  <div className={s.liveTitle}>
                    <span className={s.issue}>#{job.issue}</span>
                    <h2 id="live-title">{job.title || "…"}</h2>
                  </div>
                  <Button size="sm" tier="quiet" onClick={() => setBrief(job.issue ?? "")}>
                    Run details
                  </Button>
                </div>
                <p className={s.now} aria-live="polite">
                  {kind && kind !== "rate_limit" ? (
                    <>
                      <Dot tone="alarm" /> {KICKER[kind]}: {questionOf(kind, need, job)}
                      <WaitedFor waited={waitedFrom(need?.parked_at ?? job.action?.parked_at, log.events)} now={now} className={s.waited} />
                    </>
                  ) : (
                    <>
                      <Dot tone={kind === "rate_limit" ? "clock" : "run"} pulse={!kind} /> {nowOf(job.state)}
                    </>
                  )}
                </p>
                <StationStrip stations={stations} position={position} times={times} singleAgent={singleAgent} />
                <dl className={s.tele}>
                  <div>
                    <dt>Running for</dt>
                    <dd>{duration(job.start_time ? now - new Date(job.start_time).getTime() : null)}</dd>
                  </div>
                  <div>
                    <dt>Spent</dt>
                    <dd>{money(fromLog.cost)}</dd>
                  </div>
                  <div>
                    <dt>Stations left</dt>
                    <dd>{position ? Math.max(0, stations.length - 1 - position.at) : "—"}</dd>
                  </div>
                  <div>
                    <dt>Credential</dt>
                    <dd title="which credential of the pool is live; ↻ when it just rotated">{fromLog.credential ?? "—"}</dd>
                  </div>
                </dl>
                {kind && (
                  <div className={s.ask}>
                    {kind === "merge" && need?.review?.word && need.review.clause && (
                      <p className={s.reviewLine} data-level={need.review.level}>
                        {capitalise(need.review.clause)}
                      </p>
                    )}
                    {kind === "merge" && job.action?.pr_url && (
                      <a className={s.prLink} href={job.action.pr_url}>
                        Open the pull request
                      </a>
                    )}
                    <Answers project={project} issue={job.issue ?? ""} kind={kind} need={need} job={job} />
                  </div>
                )}
                <div className={s.feedHead}>
                  <h3>Live log</h3>
                  <span className={s.feedState} data-link={log.link}>
                    {log.link === "live" ? "streaming" : log.link === "connecting" ? "connecting…" : log.link === "reconnecting" ? "reconnecting…" : "ended"}
                  </span>
                </div>
                <LogFeed events={log.events} follow height={340} label={`Live log of #${job.issue}`} empty={log.link === "connecting" ? "Connecting to the run's log…" : "The run has not written a line yet."} />
              </>
            ) : (
              <div className={s.idle}>
                <p className={s.idleWord} data-level={f?.level ?? "unknown"}>
                  {f?.word ?? "…"}
                </p>
                <p>{f?.clause}</p>
                {f?.detail && (
                  <p className={s.sub}>
                    <Said text={f.detail} />
                  </p>
                )}
                {f?.cmd && <code className={s.cmd}>{f.cmd}</code>}
              </div>
            )}
          </section>

          <RecentRuns project={project} onOpen={setBrief} />
        </div>

        <aside className={s.side}>
          <TechLead project={project} />
          <Cockpit project={project} />
        </aside>
      </div>
      {brief && <RunBriefing project={project} issue={brief} onClose={() => setBrief(null)} />}
    </div>
  );
}

function RecentRuns({ project, onOpen }: { project: string; onOpen: (issue: string) => void }) {
  const engine = useEngine();
  const journal = useQuery({ ...q.journal(), staleTime: 15_000 });
  const [find, setFind] = useState("");
  const [shown, setShown] = useState(10);
  const now = useNow();
  const fromEngine = (engine.data?.jobs ?? []).filter((j) => j.project === project && j.status !== "running");
  const seen = new Set((engine.data?.jobs ?? []).filter((j) => j.project === project).map((j) => j.issue));
  const forgotten = (journal.data ?? []).filter((j) => j.project === project && !seen.has(j.issue));
  const all = [
    ...fromEngine.map((j) => ({ issue: j.issue ?? "", title: j.title ?? "", state: j.state ?? j.status ?? "", when: j.close_time ?? "", took: j.start_time && j.close_time ? new Date(j.close_time).getTime() - new Date(j.start_time).getTime() : null, deploy: j.deploy, forgotten: false })),
    ...forgotten.map((j) => ({ issue: j.issue ?? "", title: "", state: j.state ?? "", when: j.updated ?? "", took: null, deploy: null, forgotten: true })),
  ].sort((a, b) => b.when.localeCompare(a.when));
  const term = find.trim().toLowerCase();
  const list = term ? all.filter((r) => `#${r.issue} ${r.title} ${r.state} ${r.when.slice(0, 10)}`.toLowerCase().includes(term)) : all;

  return (
    <section className={s.runs} aria-labelledby="runs-title">
      <div className={s.runsHead}>
        <h2 id="runs-title">
          Runs <span className={s.count}>{list.length}</span>
        </h2>
        <input className={s.find} type="search" placeholder="Find by number, title, state or date" value={find} onChange={(e) => { setFind(e.target.value); setShown(10); }} aria-label="Find a run" />
      </div>
      {!list.length ? (
        <Note>{term ? "No run matches." : journal.isError ? "The engine has no runs and the journals could not be read — this is not evidence that nothing ran." : "Nothing ran on this line yet."}</Note>
      ) : (
        <ol className={s.runList}>
          {list.slice(0, shown).map((r) => (
            <li key={`${r.issue}${r.when}`}>
              <button type="button" className={s.run} onClick={() => onOpen(r.issue)}>
                <span className={s.runNo}>#{r.issue}</span>
                <span className={s.runTitle}>{r.title || (r.forgotten ? "from the journal on disk" : `card #${r.issue}`)}</span>
                <span className={s.runState} data-state={r.state}>
                  <Dot tone={r.state === "merged" || r.state === "done" ? "ok" : r.state === "failed" ? "alarm" : "idle"} />
                  {r.state.replaceAll("_", " ")}
                  {r.deploy ? ` · ${r.deploy.replaceAll("_", " ")}` : ""}
                </span>
                <span className={s.runWhen}>{ago(r.when, now)}</span>
                <span className={s.runTook}>{r.took ? duration(r.took) : ""}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      {shown < list.length && (
        <Button tier="quiet" onClick={() => setShown((n) => n + 20)}>
          Show {Math.min(20, list.length - shown)} more of {list.length - shown}
        </Button>
      )}
    </section>
  );
}

function Cockpit({ project }: { project: string }) {
  const c = useQuery(q.cockpit(project));
  const d = c.data;
  return (
    <section className={s.panel} aria-labelledby="cockpit-title">
      <h2 id="cockpit-title" className={s.panelTitle}>
        How this line runs
      </h2>
      {c.isPending ? (
        <Skeleton w="100%" h={90} />
      ) : !d ? (
        <Note tone="alarm">The line's settings could not be read. {(c.error as Error | null)?.message}</Note>
      ) : (
        <dl className={s.cockpit}>
          <div>
            <dt>Agent</dt>
            <dd>{d.harness ?? "—"}</dd>
          </div>
          <div>
            <dt>Shape</dt>
            <dd>{d.single_agent ? "one agent plans and codes" : "a planner, then the executor"}</dd>
          </div>
          {Object.entries(d.models ?? {}).map(([role, model]) => (
            <div key={role}>
              <dt>{role}</dt>
              <dd>{model}</dd>
            </div>
          ))}
          <div>
            <dt>Credentials</dt>
            <dd>
              {d.tokens?.count ?? 0} in the pool {d.tokens?.source ? `· ${d.tokens.source}` : ""}
            </dd>
          </div>
          <div>
            <dt>Review</dt>
            <dd>{d.review_mode ?? "—"}</dd>
          </div>
          {d.links?.temporal ? (
            <div>
              <dt>Engine</dt>
              <dd>
                <a href={d.links.temporal} target="_blank" rel="noreferrer">
                  open ↗
                </a>
              </dd>
            </div>
          ) : d.engine_ui_hint ? (
            <div>
              <dt>Engine</dt>
              <dd className={s.sub}>
                <Said text={d.engine_ui_hint} />
              </dd>
            </div>
          ) : null}
        </dl>
      )}
      <details className={s.how}>
        <summary>How to change any of this</summary>
        <p>
          The agent and its models are the registry's (<code>beeverforge project set-model {project} …</code>); how the project builds and checks itself is its own{" "}
          <code>.beeverforge/project.yaml</code>, committed on its base branch.
        </p>
      </details>
    </section>
  );
}
