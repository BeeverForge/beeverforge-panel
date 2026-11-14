// What the floor finished, newest first. A run the engine has forgotten is still listed from its
// journal, said as such — never dropped, never dressed up as more than the journal knows.
import { Link } from "@tanstack/react-router";
import { ago, money, useNow } from "../../live/clock";
import { Dot, Note, Skeleton } from "../../ui/Button";
import { useShipped } from "./model";
import s from "./shipped.module.css";

const OUTCOME: Record<string, { word: string; tone: "ok" | "alarm" | "idle" | "run" }> = {
  merged: { word: "merged", tone: "ok" },
  done: { word: "released", tone: "ok" },
  skipped: { word: "skipped", tone: "idle" },
  failed: { word: "stopped", tone: "alarm" },
};

const DEPLOY: Record<string, string> = {
  deploying: "deploying",
  deployed: "deployed",
  deploy_failed: "deploy failed",
  deploy_timeout: "deploy timed out",
};

export function Shipped({ project, limit = 6 }: { project?: string; limit?: number }) {
  const { runs, total, costs, loading, journalUnread } = useShipped(limit, project);
  const now = useNow();
  return (
    <section className={s.box} aria-labelledby="shipped-title">
      <div className={s.head}>
        <h2 id="shipped-title">Recently finished</h2>
        {total > limit && (
          <Link to="/logs" className={s.more}>
            All {total} runs
          </Link>
        )}
      </div>
      {loading ? (
        <div className={s.rows} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className={s.row}>
              <Skeleton w={28} h={12} />
              <Skeleton w="70%" h={12} />
              <Skeleton w={90} h={12} />
              <Skeleton w={70} h={12} />
              <Skeleton w={40} h={12} />
            </div>
          ))}
        </div>
      ) : !runs.length ? (
        <Note>{journalUnread ? "The engine has no finished runs and the journals could not be read — this is not evidence that nothing ran." : "Nothing finished yet. The first card that merges shows up here."}</Note>
      ) : (
        <ol className={s.rows}>
          {runs.map((r) => {
            const o = OUTCOME[r.state ?? ""] ?? { word: (r.state ?? "ended").replaceAll("_", " "), tone: "idle" as const };
            const deploy = "deploy" in r && r.deploy ? DEPLOY[r.deploy] : undefined;
            const cost = costs.get(`${r.project}#${r.issue}`) ?? ("cost_usd" in r ? r.cost_usd : null);
            return (
              <li key={`${r.project}#${r.issue}#${r.close_time}`} className={s.row}>
                <span className={s.n}>#{r.issue}</span>
                <span className={s.title}>
                  <Link to="/logs/$project/$issue" params={{ project: r.project ?? "", issue: r.issue ?? "" }}>
                    {"title" in r && r.title ? r.title : `card #${r.issue}`}
                  </Link>
                  {!project && <span className={s.pj}>{r.project}</span>}
                  {r.forgotten && <span className={s.pj}>from the journal</span>}
                </span>
                <span className={s.when}>
                  {o.word} {ago(r.close_time, now)}
                </span>
                <span className={s.state}>
                  <Dot tone={deploy === "deploy failed" ? "alarm" : deploy === "deploying" ? "run" : o.tone} />
                  {deploy ?? o.word}
                </span>
                <span className={s.cost}>{money(cost)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
